import {IAgentRuntime, Memory, Provider, State} from "@elizaos/core";
import {PoolCreation} from "../interfaces/uniswap.interfaces.ts";
import {POOLS_V3_ROOM} from "../constants.ts";

export const latestUniswapV3PoolsProvider: Provider = {
	get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
		try {
			const memories = await runtime.messageManager.getMemories({
				roomId: POOLS_V3_ROOM,
				count: 5,
				unique: true
			});

			if (memories.length === 0) {
				return "No recent Uniswap V3 pools found at this time.";
			}

			const pools = memories
				.map(memory => {
					const pool = memory.content.poolData as PoolCreation;

					return `
📍 Pool Address: ${pool.pool}
🔄 Tokens: ${pool.token0} / ${pool.token1}
💰 Fee Tier: ${pool.fee / 10000}% (${pool.fee} bps)
📊 Tick Spacing: ${pool.tickSpacing}
🔢 Block: ${pool.blockNumber}
🔗 Tx: ${pool.transactionHash}
⏰ Created: ${new Date(pool.blockTimestamp).toLocaleString()}
					`.trim();
				})
				.join('\n\n');

			return `Latest Uniswap V3 Pools: \n ${pools}`;
		} catch (error) {
			console.error("Latest Uniswap V3 pools provider error:", error);
			return "Unable to fetch Uniswap V3 pools at this time.";
		}
	}
};