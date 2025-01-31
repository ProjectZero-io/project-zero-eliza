import {elizaLogger, IAgentRuntime, Service, ServiceType} from "@elizaos/core";
import express from 'express';
import bodyParser from 'body-parser';
import {PostgresDatabaseAdapter} from "@elizaos/adapter-postgres";
import net from 'net';
import {PairCreation, PoolCreation, SwapV2, SwapV3, UniswapBlockData} from "../interfaces/uniswap.interfaces.ts";

const WEBHOOK_SERVICE = 'WEBHOOK_SERVICE' as ServiceType;
const PORT = 3030;

export class UniswapWebhookService extends Service {
	private app: express.Application;
	private runtime: IAgentRuntime;
	private server: net.Server | null = null;
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

		this.isInitialized = true
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

		this.app.get('/health', (req, res) => {
			res.status(200).json({
				status: 'healthy',
				service: 'Uniswap Webhook Service',
				port: PORT
			});
		});

		this.app.post('/', (req, res) => {
			res.status(200).json({
				status: 'running',
				service: 'Uniswap Webhook Service',
				endpoints: ['/webhook', '/health']
			});
		});
	}

	private async processBlockData(blockData: UniswapBlockData): Promise<void> {
		const db = this.runtime.databaseAdapter as PostgresDatabaseAdapter;
		const processors = [];

		if (blockData.uniswapV2.swaps.length > 0) {
			processors.push(this.processV2Swaps(db, blockData.uniswapV2.swaps));
		}

		if (blockData.uniswapV3.swaps.length > 0) {
			processors.push(this.processV3Swaps(db, blockData.uniswapV3.swaps));
		}

		if (blockData.uniswapV2.pairCreations.length > 0) {
			processors.push(this.processPairCreations(db, blockData.uniswapV2.pairCreations));
		}

		if (blockData.uniswapV3.poolCreations.length > 0) {
			processors.push(this.processPoolCreations(db, blockData.uniswapV3.poolCreations));
		}

		await Promise.all(processors);

		elizaLogger.info(`Processed block #${blockData.number}. V2 Pairs: ${blockData.uniswapV2.pairCreations.length}, V3 Pools: ${blockData.uniswapV3.poolCreations.length} V2 Swaps: ${blockData.uniswapV2.swaps.length}, V3 Swaps: ${blockData.uniswapV3.swaps.length}`);
	}

	private async processPairCreations(db: PostgresDatabaseAdapter, pairCreations: PairCreation[]): Promise<void> {
		for (const pair of pairCreations) {
			await db.query(`
				INSERT INTO uniswap_v2_pairs 
				(address, token0, token1, block_number, block_timestamp, transaction_hash)
				VALUES ($1, $2, $3, $4, $5, $6)
				ON CONFLICT (address) DO NOTHING
			`, [
				pair.pair,
				pair.token0,
				pair.token1,
				pair.blockNumber,
				new Date(pair.blockTimestamp * 1000).toISOString(),
				pair.transactionHash
			]);
		}
	}

	private async processPoolCreations(db: PostgresDatabaseAdapter, poolCreations: PoolCreation[]): Promise<void> {
		for (const pool of poolCreations) {
			await db.query(`
				INSERT INTO uniswap_v3_pools 
				(address, token0, token1, fee, tick_spacing, block_number, block_timestamp, transaction_hash)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
				ON CONFLICT (address) DO NOTHING
			`, [
				pool.pool,
				pool.token0,
				pool.token1,
				pool.fee,
				pool.tickSpacing,
				pool.blockNumber,
				new Date(pool.blockTimestamp * 1000).toISOString(),
				pool.transactionHash
			]);
		}
	}

	private async processV2Swaps(db: PostgresDatabaseAdapter, swaps: SwapV2[]): Promise<void> {
		for (const swap of swaps) {
			await db.query(`
				INSERT INTO uniswap_v2_swaps 
				(pair, sender, "to", amount0_in, amount1_in, amount0_out, amount1_out, block_number, block_timestamp, transaction_hash, log_index)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
				ON CONFLICT (transaction_hash, log_index) DO NOTHING
			`, [
				swap.pair,
				swap.sender,
				swap.to,
				swap.amount0In,
				swap.amount1In,
				swap.amount0Out,
				swap.amount1Out,
				swap.blockNumber,
				new Date(swap.blockTimestamp * 1000).toISOString(),
				swap.transactionHash,
				swap.logIndex
			]);
		}
	}

	private async processV3Swaps(db: PostgresDatabaseAdapter, swaps: SwapV3[]): Promise<void> {
		for (const swap of swaps) {
			await db.query(`
				INSERT INTO uniswap_v3_swaps 
				(pool, sender, recipient, amount0, amount1, sqrt_price_x96, liquidity, tick, block_number, block_timestamp, transaction_hash, log_index)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
				ON CONFLICT (transaction_hash, log_index) DO NOTHING
			`, [
				swap.pool,
				swap.sender,
				swap.recipient,
				swap.amount0,
				swap.amount1,
				swap.sqrtPriceX96,
				swap.liquidity,
				swap.tick,
				swap.blockNumber,
				new Date(swap.blockTimestamp * 1000).toISOString(),
				swap.transactionHash,
				swap.logIndex
			]);
		}
	}

	private async startServer(): Promise<void> {
		if (this.server) {
			elizaLogger.info(`Webhook server already running on port ${PORT}`);
			return;
		}

		return new Promise((resolve, reject) => {
			try {
				const server = this.app.listen(PORT, '0.0.0.0', () => {
					const address = server.address() as net.AddressInfo;
					elizaLogger.info(`Webhook service running on port ${address.port}`);
					resolve();
				});

				server.on('error', (error) => {
					elizaLogger.error('Error starting webhook server', error);
					reject(error);
				});

				this.server = server;
			} catch (error) {
				elizaLogger.error('Failed to start webhook server', error);
				reject(error);
			}
		});
	}
}
