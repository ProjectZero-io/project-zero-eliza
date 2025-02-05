import type {Action, ActionExample, HandlerCallback, IAgentRuntime, Memory, State} from "@elizaos/core";
import {activeUniswapV3PoolsProvider} from "../providers/active-v3-pools.provider";

interface PoolActivity {
	pool_address: string;
	token0: string;
	token1: string;
	fee: number;
	total_swaps: number;
	buy_count: number;
	sell_count: number;
	token0_volume: string;
	token1_volume: string;
}

const formatFee = (fee: number): string => {
	return `${(fee / 10000).toFixed(2)}%`;
};

const formatPoolActivity = (pools: PoolActivity[]): string => {
	if (pools.length === 0) {
		return "No active pools found in the last 24 hours.";
	}

	const poolStats = pools
		.map(pool => `
📍 Pool Address: ${pool.pool_address}
🔄 Tokens: ${pool.token0} / ${pool.token1}
💸 Fee Tier: ${formatFee(pool.fee)}
📊 Total Swaps (24h): ${pool.total_swaps.toLocaleString()}
📈 Buys: ${pool.buy_count.toLocaleString()}
📉 Sells: ${pool.sell_count.toLocaleString()}
💰 Volume Token0: ${Number(pool.token0_volume).toLocaleString()}
💰 Volume Token1: ${Number(pool.token1_volume).toLocaleString()}
        `.trim())
		.join('\n\n');

	return `Most Active Uniswap V3 Pools (Last 24h):\n\n${poolStats}`;
};

export const activeV3PoolsAction: Action = {
	name: "ACTIVE_V3_POOLS",
	similes: ["HIGH_VOLUME_V3_POOLS", "BUSY_V3_POOLS", "TOP_V3_POOLS", "ACTIVE_UNISWAP_V3", "TOP_TRADING_V3_POOLS"],
	description: "Shows Uniswap V3 pools with high trading activity in the last 24 hours.",

	validate: async (_runtime: IAgentRuntime, message: Memory) => {
		const text = (message.content as { text: string }).text.toLowerCase();
		const triggers = [
			"active v3",
			"active pools",
			"high volume v3",
			"busy pools",
			"top pools",
			"trading pools",
			"most active v3",
			"most traded v3",
			"volume leaders v3",
			"active uniswap v3",
			"high volume uniswap v3"
		];
		return triggers.some(trigger => text.includes(trigger));
	},

	handler: async (
		runtime: IAgentRuntime,
		message: Memory,
		state: State,
		_options: { [key: string]: unknown },
		callback: HandlerCallback
	): Promise<boolean> => {
		try {
			const activePools = await activeUniswapV3PoolsProvider.get(runtime, message, state);

			if (!Array.isArray(activePools)) {
				await callback({
					text: "Error: Unexpected provider response format",
					action: "ACTIVE_V3_POOLS"
				});
				return false;
			}

			const formattedResponse = formatPoolActivity(activePools);

			await callback({
				text: formattedResponse,
				action: "ACTIVE_V3_POOLS"
			});

			return true;
		} catch (error) {
			console.error("Error in ACTIVE_V3_POOLS action:", error);
			await callback({
				text: "Sorry, I encountered an error while fetching active V3 pools. Please try again later.",
				action: "ACTIVE_V3_POOLS"
			});
			return false;
		}
	},

	examples: [
		[
			{
				user: "{{user1}}",
				content: { text: "Show me active Uniswap V3 pools" }
			},
			{
				user: "{{user2}}",
				content: {
					text: "Here are the most active Uniswap V3 pools in the last 24 hours:",
					action: "ACTIVE_V3_POOLS"
				}
			}
		],
		[
			{
				user: "{{user1}}",
				content: { text: "Which V3 pools have high volume?" }
			},
			{
				user: "{{user2}}",
				content: {
					text: "Here are the high-volume Uniswap V3 pools I found:",
					action: "ACTIVE_V3_POOLS"
				}
			}
		]
	] as ActionExample[][]
};
