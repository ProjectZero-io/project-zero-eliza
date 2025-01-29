import { elizaLogger, IAgentRuntime, Service, ServiceType, Memory, stringToUuid } from "@elizaos/core";
import express from 'express';
import bodyParser from 'body-parser';
import { UniswapBlockData, PairCreation, PoolCreation } from "../interfaces/uniswap.interfaces";

const WEBHOOK_SERVICE = 'WEBHOOK_SERVICE' as ServiceType;
const PORT = 3030;

export class UniswapWebhookService extends Service {
	private app: express.Application;
	private runtime: IAgentRuntime;
	private server: any = null;
	private isInitialized = false;

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

	private async processBlockData(blockData: UniswapBlockData): Promise<void> {
		const processors = [];

		if (blockData.uniswapV2.pairCreations.length > 0) {
			processors.push(this.processPairCreations(blockData.uniswapV2.pairCreations));
		}

		if (blockData.uniswapV3.poolCreations.length > 0) {
			processors.push(this.processPoolCreations(blockData.uniswapV3.poolCreations));
		}

		await Promise.all(processors);
	}

	private async processPairCreations(pairCreations: PairCreation[]): Promise<void> {
		for (const pair of pairCreations) {
			const memory: Memory = {
				id: stringToUuid(pair.transactionHash),
				roomId: stringToUuid('uniswap-v2-room'),
				userId: this.runtime.agentId,
				agentId: this.runtime.agentId,
				createdAt: Date.now(),
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
		}
	}

	private async processPoolCreations(poolCreations: PoolCreation[]): Promise<void> {
		for (const pool of poolCreations) {
			const memory: Memory = {
				id: stringToUuid(pool.transactionHash),
				roomId: stringToUuid('uniswap-v3-room'),
				userId: this.runtime.agentId,
				agentId: this.runtime.agentId,
				createdAt: Date.now(),
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
		}
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
}
