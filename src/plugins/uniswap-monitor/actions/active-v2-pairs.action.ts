import type {Action, ActionExample, HandlerCallback, IAgentRuntime, Memory, State} from "@elizaos/core";
import {activeUniswapV2PairsProvider} from "../providers/active-v2-pairs.provider";

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
			// Get active pairs from provider
			const pairsInfo = await activeUniswapV2PairsProvider.get(runtime, message, state);

			if (typeof pairsInfo !== 'string') {
				await callback({
					text: "Error: Unexpected provider response format",
					action: "ACTIVE_V2_PAIRS"
				});
				return false;
			}

			if (pairsInfo.includes("No pairs met the activity criteria")) {
				await callback({
					text: "No pairs met the high activity criteria in the last 24 hours (>$2M volume, >2000 trades, >1000 buys, >1000 sells)",
					action: "ACTIVE_V2_PAIRS"
				});
				return true;
			}

			await callback({
				text: pairsInfo,
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
		],
		[
			{
				user: "{{user1}}",
				content: { text: "show top trading pairs" }
			},
			{
				user: "{{user2}}",
				content: {
					text: "Here are the most actively traded Uniswap V2 pairs:",
					action: "ACTIVE_V2_PAIRS"
				}
			}
		]
	] as ActionExample[][]
};
