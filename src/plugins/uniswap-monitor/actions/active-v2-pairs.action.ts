import type {Action, ActionExample, HandlerCallback, IAgentRuntime, Memory, State} from "@elizaos/core";
import {activeUniswapV2PairsProvider} from "../providers/active-v2-pairs.provider";

interface PairActivity {
	pair_address: string;
	token0: string;
	token1: string;
	total_swaps: number;
	buy_count: number;
	sell_count: number;
	token0_volume: string;
	token1_volume: string;
}

const formatPairActivity = (pairs: PairActivity[]): string => {
	if (pairs.length === 0) {
		return "No active pairs found in the last 24 hours.";
	}

	const pairStats = pairs
		.map(pair => `
📍 Pair Address: ${pair.pair_address}
🔄 Tokens: ${pair.token0} / ${pair.token1}
📊 Total Swaps (24h): ${pair.total_swaps.toLocaleString()}
📈 Buys: ${pair.buy_count.toLocaleString()}
📉 Sells: ${pair.sell_count.toLocaleString()}
💰 Volume Token0: ${Number(pair.token0_volume).toLocaleString()}
💰 Volume Token1: ${Number(pair.token1_volume).toLocaleString()}
        `.trim())
		.join('\n\n');

	return `Most Active Uniswap V2 Pairs (Last 24h):\n\n${pairStats}`;
};

export const activeV2PairsAction: Action = {
	name: "ACTIVE_V2_PAIRS",
	similes: ["HIGH_VOLUME_V2_PAIRS", "BUSY_V2_PAIRS", "TOP_V2_PAIRS", "ACTIVE_UNISWAP_V2", "TOP_TRADING_V2_PAIRS"],
	description: "Shows Uniswap V2 pairs with high trading activity in the last 24 hours.",

	validate: async (_runtime: IAgentRuntime, message: Memory) => {
		const text = (message.content as { text: string }).text.toLowerCase();
		const triggers = [
			"active v2",
			"active pairs",
			"high volume pairs",
			"busy pairs",
			"top pairs",
			"trading pairs",
			"most active v2",
			"most traded v2",
			"volume leaders",
			"active uniswap",
			"high volume uniswap"
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
			const activePairs = await activeUniswapV2PairsProvider.get(runtime, message, state);

			if (!Array.isArray(activePairs)) {
				await callback({
					text: "Error: Unexpected provider response format",
					action: "ACTIVE_V2_PAIRS"
				});
				return false;
			}

			const formattedResponse = formatPairActivity(activePairs);

			await callback({
				text: formattedResponse,
				action: "ACTIVE_V2_PAIRS"
			});

			return true;
		} catch (error) {
			console.error("Error in ACTIVE_V2_PAIRS action:", error);
			await callback({
				text: "Sorry, I encountered an error while fetching active V2 pairs. Please try again later.",
				action: "ACTIVE_V2_PAIRS"
			});
			return false;
		}
	},

	examples: [
		[
			{
				user: "{{user1}}",
				content: { text: "Show me active Uniswap V2 pairs" }
			},
			{
				user: "{{user2}}",
				content: {
					text: "Here are the most active Uniswap V2 pairs in the last 24 hours:",
					action: "ACTIVE_V2_PAIRS"
				}
			}
		],
		[
			{
				user: "{{user1}}",
				content: { text: "Which V2 pairs have high volume?" }
			},
			{
				user: "{{user2}}",
				content: {
					text: "Here are the high-volume Uniswap V2 pairs I found:",
					action: "ACTIVE_V2_PAIRS"
				}
			}
		]
	] as ActionExample[][]
};
