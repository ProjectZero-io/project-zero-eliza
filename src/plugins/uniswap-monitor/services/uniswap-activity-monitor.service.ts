import {elizaLogger, generateText, IAgentRuntime, Memory, ModelClass, Service, ServiceType, State} from "@elizaos/core";
import {PostgresDatabaseAdapter} from "@elizaos/adapter-postgres";
import {Scraper} from "agent-twitter-client";
import {activeUniswapV2PairsProvider} from "../providers/active-v2-pairs.provider";
import {activeUniswapV3PoolsProvider} from "../providers/active-v3-pools.provider";
import {Blockchain} from "../interfaces/uniswap.interfaces.ts";

const ACTIVITY_MONITOR_SERVICE = 'ACTIVITY_MONITOR_SERVICE' as ServiceType;
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MIN_TRADE_COUNT = 500;

interface PairActivity {
	pair_address: string;
	token0: string;
	token1: string;
	total_swaps: number;
	token0_volume: string;
	token1_volume: string;
}

interface PoolActivity {
	pool_address: string;
	token0: string;
	token1: string;
	fee: number;
	total_swaps: number;
	token0_volume: string;
	token1_volume: string;
}

export class UniswapActivityMonitorService extends Service {
	private runtime: IAgentRuntime;
	private twitterClient: Scraper;
	private checkInterval: NodeJS.Timeout | null = null;

	constructor() {
		super();

		this.twitterClient = new Scraper();
	}

	get serviceType(): ServiceType {
		return ACTIVITY_MONITOR_SERVICE;
	}

	async initialize(runtime: IAgentRuntime): Promise<void> {
		this.runtime = runtime;

		await this.twitterClient.login(
			process.env.TWITTER_USERNAME,
			process.env.TWITTER_PASSWORD,
			process.env.TWITTER_EMAIL,
			process.env.TWITTER_2FA_SECRET
		);

		await this.startMonitoring();
		elizaLogger.info('Uniswap Activity Monitor Service initialized');
	}

	private async startMonitoring(): Promise<void> {
		try {
			const blockchains = [Blockchain.ETHEREUM, Blockchain.BASE];

			for (const blockchain of blockchains) {
				await this.checkAndReport(blockchain);
			}

			this.checkInterval = setInterval(async () => {
				try {
					for (const blockchain of blockchains) {
						await this.checkAndReport(blockchain);
					}
				} catch (error) {
					elizaLogger.error('Error in activity check:', error);
				}
			}, CHECK_INTERVAL);
		} catch (error) {
			elizaLogger.error('Error in initial activity check:', error);
		}
	}

	public stop(): void {
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		}
	}

	private async isAlreadyPosted(address: string, blockchain: Blockchain): Promise<boolean> {
		const table = `${blockchain}_posted_uniswap_activity`;

		const db = this.runtime.databaseAdapter as PostgresDatabaseAdapter;
		const result = await db.query(
			`SELECT EXISTS(SELECT 1 FROM ${table} WHERE address = $1)`,
			[address]
		);
		return result.rows[0].exists;
	}

	private async markAsPosted(address: string, activity: PairActivity | PoolActivity, protocol: 'v2' | 'v3', blockchain: Blockchain): Promise<void> {
		const table = `${blockchain}_posted_uniswap_activity`;
		const db = this.runtime.databaseAdapter as PostgresDatabaseAdapter;

		await db.query(`
            INSERT INTO ${table} 
                (address, protocol, token0, token1, trade_count, fee)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
			address,
			protocol,
			activity.token0,
			activity.token1,
			activity.total_swaps,
			'fee' in activity ? activity.fee : null
		]);
	}

	private async formatTweetText(activity: PairActivity | PoolActivity, protocol: 'v2' | 'v3'): Promise<string> {
		try {
			const address = 'pair_address' in activity ? activity.pair_address : activity.pool_address;
			const tokens = 'token0' in activity ? `${activity.token0}/${activity.token1}` : 'tokens';

			const context = `Create a concise tweet about a trending Uniswap ${protocol.toUpperCase()} pair/pool.
			Blockchain: Ethereum 
        Pair/Pool address: ${address}
        Total swaps in 24h: ${activity.total_swaps}

        The tweet should:
        - Fit within 280 characters
        - Be engaging and informative
        - Include a call-to-action
        - Use crypto/trading hashtags
        - Show only data given in the context
        - Don't make it up, be honest
        - Don't mention tokens in the pool
        - Always Include a link to the Uniswap pool
        - Example of the link https://app.uniswap.org/explore/pools/ethereum/0xbaa20e295f153a9681fec8de1e88c2448a34320b , where the last part is the address of the pool, and ethereum is the network.`;

			const tweet = await generateText({
				runtime: this.runtime,
				context: context,
				modelClass: ModelClass.SMALL,
				stop: ['\n']
			});

			// Ensure the tweet is within 280 characters
			return tweet.length > 280 ? tweet.slice(0, 277) + '...' : tweet;
		} catch (error) {
			elizaLogger.error(`Error generating tweet: ${error}`);

			// Fallback to a default tweet format
			return `High Activity Alert! ${protocol.toUpperCase()}\n\nPool: ${
				'pair_address' in activity ? activity.pair_address : activity.pool_address
			}`;
		}
	}

	private async postToTwitter(text: string): Promise<void> {
		try {
			const response = await this.twitterClient.sendTweet(text);
			const body = await response.json();

			const tweet = body?.data?.create_tweet?.tweet_results?.result;

			if (tweet) {
				elizaLogger.info('Tweet successfully posted:', {
					id: tweet.rest_id,
					text: tweet.legacy?.full_text,
					url: `https://twitter.com/${process.env.TWITTER_USERNAME}/status/${tweet.rest_id}`
				});
			} else {
				elizaLogger.error('Tweet creation failed - no tweet data in response:', body);

				if (body?.errors) {
					elizaLogger.error('Twitter API errors:', body.errors);
				}
			}

		} catch (error) {
			elizaLogger.error('Error posting to Twitter:', {
				error: error.message,
				stack: error.stack,
				response: error.response
			});
			throw error;
		}
	}

	private async checkAndReport(blockchain: Blockchain): Promise<void> {
		try {
			const [v2Pairs, v3Pools] = await Promise.all([
				activeUniswapV2PairsProvider.get(this.runtime, {} as Memory, {} as State, blockchain),
				activeUniswapV3PoolsProvider.get(this.runtime, {} as Memory, {} as State, blockchain)
			]);

			for (const pair of v2Pairs) {
				if (pair.total_swaps >= MIN_TRADE_COUNT && !(await this.isAlreadyPosted(pair.pair_address, blockchain))) {
					try {
						const tweetText = await this.formatTweetText(pair, 'v2');
						await this.postToTwitter(tweetText);
						await this.markAsPosted(pair.pair_address, pair, 'v2', blockchain);

						await new Promise(resolve => setTimeout(resolve, 2000));
					} catch (error) {
						elizaLogger.error(`Error posting V2 pair ${pair.pair_address}:`, error);
					}
				}
			}

			for (const pool of v3Pools) {
				if (pool.total_swaps >= MIN_TRADE_COUNT && !(await this.isAlreadyPosted(pool.pool_address, blockchain))) {
					try {
						const tweetText = await this.formatTweetText(pool, 'v3');
						await this.postToTwitter(tweetText);
						await this.markAsPosted(pool.pool_address, pool, 'v3', blockchain);

						await new Promise(resolve => setTimeout(resolve, 2000));
					} catch (error) {
						elizaLogger.error(`Error posting V3 pool ${pool.pool_address}:`, error);
					}
				}
			}

			const newV2Count = v2Pairs.filter(p => p.total_swaps >= MIN_TRADE_COUNT).length;
			const newV3Count = v3Pools.filter(p => p.total_swaps >= MIN_TRADE_COUNT).length;

			if (newV2Count > 0 || newV3Count > 0) {
				elizaLogger.info(`Found ${newV2Count} new active V2 pairs and ${newV3Count} new active V3 pools`);
			}
		} catch (error) {
			elizaLogger.error('Error in checkAndReport:', error);
		}
	}
}
