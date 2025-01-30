import {elizaLogger, IAgentRuntime, Memory, Service, ServiceType, stringToUuid} from "@elizaos/core";
import express from 'express';
import bodyParser from 'body-parser';
import {PairCreation, PoolCreation, SwapV2, SwapV3, UniswapBlockData} from "../interfaces/uniswap.interfaces";
import {PAIRS_V2_ROOM, POOLS_V3_ROOM, SWAPS_V2_ROOM, SWAPS_V3_ROOM} from "../constants.ts";

const WEBHOOK_SERVICE = 'WEBHOOK_SERVICE' as ServiceType;
const PORT = 3030;

interface TrackedPool {
	address: string;
	token0: string;
	token1: string;
	// createdAt: number;
	version: 'v2' | 'v3';
}

export class UniswapWebhookService extends Service {
	private app: express.Application;
	private runtime: IAgentRuntime;
	private server: any = null;
	private isInitialized = false;

	private trackedPools: Map<string, TrackedPool> = new Map();

	constructor() {
		super();
		this.app = express();
		this.app.use(bodyParser.json({
			limit: '50mb',
			verify: (req: any, res, buf) => {
				req.rawBody = buf.toString();
			}
		}));
	}

	get serviceType(): ServiceType {
		return WEBHOOK_SERVICE;
	}

	async initialize(runtime: IAgentRuntime): Promise<void> {
		if (this.isInitialized) {
			elizaLogger.info(`Webhook service already initialized on port ${PORT}`);
			return;
		}

		this.runtime = runtime;
		this.setupRoutes();
		await this.startServer();
		this.isInitialized = true;

		await this.loadExistingPools();
	}

	private async startServer(): Promise<void> {
		if (this.server) {
			elizaLogger.info(`Webhook server already running on port ${PORT}`);
			return;
		}

		return new Promise((resolve, reject) => {
			try {
				this.server = this.app.listen(PORT, '0.0.0.0', () => {
					const address = this.server.address();
					elizaLogger.info(`Webhook service running on port ${address.port}`);
					resolve();
				});

				this.server.on('error', (error) => {
					elizaLogger.error('Error starting webhook server', error);
					reject(error);
				});
			} catch (error) {
				elizaLogger.error('Failed to start webhook server', error);
				reject(error);
			}
		});
	}

	public stop(): void {
		if (this.server) {
			this.server.close();
			elizaLogger.info(`Stopped webhook service on port ${PORT}`);
		}
	}

	private setupRoutes() {
		this.app.post('/webhook', async (req, res) => {
			try {
				const body: { data: UniswapBlockData[] } = req.body;
				for (const blockData of body.data) {
					await this.processBlockData(blockData);
				}
				res.status(200).send('ok');
			} catch (error) {
				elizaLogger.error('Error processing webhook', error);
				res.status(500).json({
					status: 'error',
					message: 'Failed to process webhook'
				});
			}
		});

		// Health check routes remain the same
		this.app.get('/health', (req, res) => {
			res.status(200).json({
				status: 'healthy',
				service: 'Uniswap Webhook Service',
				port: PORT
			});
		});
	}

	private async loadExistingPools(): Promise<void> {
		try {
			const memories = await this.runtime.messageManager.getMemoriesByRoomIds({
				roomIds: [PAIRS_V2_ROOM, POOLS_V3_ROOM],
			});

			for (const memory of memories) {
				const pairData = memory.content.pairData as PairCreation;
				const poolData = memory.content.poolData as PoolCreation;

				if (pairData) {
					this.trackedPools.set(pairData.pair.toLowerCase(), {
						address: pairData.pair,
						token0: pairData.token0,
						token1: pairData.token1,
						version: 'v2'
					});
				}

				if (poolData) {
					this.trackedPools.set(poolData.pool.toLowerCase(), {
						address: poolData.pool,
						token0: poolData.token0,
						token1: poolData.token1,
						version: 'v3'
					});
				}
			}

			elizaLogger.info(`Loaded ${this.trackedPools.size} tracked pools`);
		} catch (error) {
			elizaLogger.error('Error loading existing pools', error);
			throw error;
		}
	}

	private async processBlockData(blockData: UniswapBlockData): Promise<void> {
		await this.processPools(blockData);

		await this.processSwaps(blockData);
	}

	private async processPools(blockData: UniswapBlockData): Promise<any> {
		const processors = [];

		if (blockData.uniswapV2.pairCreations && blockData.uniswapV2.pairCreations.length > 0) {
			processors.push(this.processPairCreations(blockData.uniswapV2.pairCreations));
		}

		if (blockData.uniswapV3.poolCreations && blockData.uniswapV3.poolCreations.length > 0) {
			processors.push(this.processPoolCreations(blockData.uniswapV3.poolCreations));
		}

		await Promise.all(processors);
	}

	private async processSwaps(blockData: UniswapBlockData): Promise<any> {
		const processors = [];

		if (blockData.uniswapV2.swaps && blockData.uniswapV2.swaps.length > 0) {
			processors.push(this.processSwapV2(blockData.uniswapV2.swaps));
		}

		if (blockData.uniswapV3.swaps && blockData.uniswapV3.swaps.length > 0) {
			processors.push(this.processSwapV3(blockData.uniswapV3.swaps));
		}

		await Promise.all(processors);
	}

	private async processPairCreations(pairCreations: PairCreation[]): Promise<void> {
		for (const pair of pairCreations) {
			const memory: Memory = {
				id: stringToUuid(pair.pair),
				roomId: PAIRS_V2_ROOM,
				userId: this.runtime.agentId,
				agentId: this.runtime.agentId,
				createdAt: pair.blockTimestamp * 1000,
				content: {
					text: `New Uniswap V2 pair created: ${pair.pair}`,
					source: 'uniswap-v2',
					pairData: {
						pair: pair.pair,
						token0: pair.token0,
						token1: pair.token1,
						blockNumber: pair.blockNumber,
						blockTimestamp: new Date(pair.blockTimestamp * 1000).toISOString(),
						transactionHash: pair.transactionHash
					}
				}
			};

			await this.runtime.messageManager.createMemory(memory);

			this.trackedPools.set(pair.pair.toLowerCase(), {
				address: pair.pair,
				token0: pair.token0,
				token1: pair.token1,
				version: 'v2'
			});
		}
	}

	private async processPoolCreations(poolCreations: PoolCreation[]): Promise<void> {
		for (const pool of poolCreations) {
			const memory: Memory = {
				id: stringToUuid(pool.pool),
				roomId: POOLS_V3_ROOM,
				userId: this.runtime.agentId,
				agentId: this.runtime.agentId,
				createdAt: pool.blockTimestamp * 1000,
				content: {
					text: `New Uniswap V3 pool created: ${pool.pool}`,
					source: 'uniswap-v3',
					poolData: {
						pool: pool.pool,
						token0: pool.token0,
						token1: pool.token1,
						fee: pool.fee,
						tickSpacing: pool.tickSpacing,
						blockNumber: pool.blockNumber,
						timestamp: new Date(pool.blockTimestamp * 1000).toISOString(),
						transactionHash: pool.transactionHash
					}
				}
			};

			await this.runtime.messageManager.createMemory(memory);

			this.trackedPools.set(pool.pool.toLowerCase(), {
				address: pool.pool,
				token0: pool.token0,
				token1: pool.token1,
				version: 'v3'
			});
		}
	}

	private async processSwapV2(swaps: SwapV2[]): Promise<void> {
		const swapsByPair: { [key: string]: SwapV2[] } = {};

		for (const swap of swaps) {
			const pairAddress = swap.pair.toLowerCase();
			if (this.trackedPools.has(pairAddress)) {
				if (!swapsByPair[pairAddress]) {
					swapsByPair[pairAddress] = [];
				}
				swapsByPair[pairAddress].push(swap);
			}
		}

		for (const [pairAddress, pairSwaps] of Object.entries(swapsByPair)) {
			const blockTimestamp = pairSwaps[0].blockTimestamp * 1000;

			const memory: Memory = {
				id: stringToUuid(`${pairAddress}-${Date.now()}`),
				roomId: SWAPS_V2_ROOM,
				userId: this.runtime.agentId,
				agentId: this.runtime.agentId,
				createdAt: blockTimestamp,
				content: {
					text: `Processed ${pairSwaps.length} swaps for V2 pair ${pairAddress}`,
					source: 'uniswap-v2',
					swaps: pairSwaps.map(swap => ({
						pair: swap.pair,
						sender: swap.sender,
						to: swap.to,
						amount0In: swap.amount0In,
						amount1In: swap.amount1In,
						amount0Out: swap.amount0Out,
						amount1Out: swap.amount1Out,
						blockNumber: swap.blockNumber,
						timestamp: new Date(swap.blockTimestamp * 1000).toISOString(),
						transactionHash: swap.transactionHash
					})),
				}
			};

			await this.runtime.messageManager.createMemory(memory);
		}
	}

	private async processSwapV3(swaps: SwapV3[]): Promise<void> {
		const swapsByPool: { [key: string]: SwapV3[] } = {};

		for (const swap of swaps) {
			const poolAddress = swap.pool.toLowerCase();
			if (this.trackedPools.has(poolAddress)) {
				if (!swapsByPool[poolAddress]) {
					swapsByPool[poolAddress] = [];
				}
				swapsByPool[poolAddress].push(swap);
			}
		}

		for (const [poolAddress, poolSwaps] of Object.entries(swapsByPool)) {
			const blockTimestamp = poolSwaps[0].blockTimestamp * 1000;

			const memory: Memory = {
				id: stringToUuid(`${poolAddress}-${Date.now()}`),
				roomId: SWAPS_V3_ROOM,
				userId: this.runtime.agentId,
				agentId: this.runtime.agentId,
				createdAt: blockTimestamp,
				content: {
					text: `Processed ${poolSwaps.length} swaps for V3 pool ${poolAddress}`,
					source: 'uniswap-v3',
					swaps: poolSwaps.map(swap => ({
						pool: swap.pool,
						sender: swap.sender,
						recipient: swap.recipient,
						amount0: swap.amount0,
						amount1: swap.amount1,
						sqrtPriceX96: swap.sqrtPriceX96,
						liquidity: swap.liquidity,
						tick: swap.tick,
						blockNumber: swap.blockNumber,
						timestamp: new Date(swap.blockTimestamp * 1000).toISOString(),
						transactionHash: swap.transactionHash
					})),
				}
			};

			await this.runtime.messageManager.createMemory(memory);
		}
	}
}
