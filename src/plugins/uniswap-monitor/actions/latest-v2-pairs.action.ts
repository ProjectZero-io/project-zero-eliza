import type { Action, ActionExample, HandlerCallback, IAgentRuntime, Memory, State } from "@elizaos/core";
import { latestUniswapV2PairsProvider } from "../providers/latest-v2-pairs.provider";

export const latestV2PairsAction: Action = {
	name: "LATEST_V2_PAIRS",
	similes: ["SHOW_V2_PAIRS", "GET_V2_PAIRS", "LIST_V2_PAIRS", "LATEST_UNISWAP_V2"],
	description: "Retrieves and displays the most recently created Uniswap V2 pairs.",

	validate: async (_runtime: IAgentRuntime, message: Memory) => {
		const text = (message.content as { text: string }).text.toLowerCase();
		const triggers = [
			"v2 pairs",
			"v2 pair",
			"uniswap v2",
			"latest v2",
			"new v2 pairs",
			"show v2",
			"list v2",
			"latest pairs v2",
			"new pairs v2",
			"show pairs v2",
			"list pairs v2"
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
			// Directly call the provider to get the latest V2 pairs
			const pairsInfo = await latestUniswapV2PairsProvider.get(runtime, message, state);

			if (typeof pairsInfo !== 'string') {
				await callback({
					text: "Error: Unexpected provider response format",
					action: "LATEST_V2_PAIRS"
				});
				return false;
			}

			if (pairsInfo.includes("No Uniswap V2 pairs found")) {
				await callback({
					text: "No recent Uniswap V2 pairs found at this time.",
					action: "LATEST_V2_PAIRS"
				});
				return true;
			}

			await callback({
				text: pairsInfo,
				action: "LATEST_V2_PAIRS"
			});

			return true;
		} catch (error) {
			console.error("Error in LATEST_V2_PAIRS action:", error);
			await callback({
				text: "Sorry, I encountered an error while fetching the latest V2 pairs. Please try again later.",
				action: "LATEST_V2_PAIRS"
			});
			return false;
		}
	},

	examples: [
		[
			{
				user: "{{user1}}",
				content: { text: "Show me the latest Uniswap V2 pairs" }
			},
			{
				user: "{{user2}}",
				content: {
					text: "Here are the latest Uniswap V2 pairs:",
					action: "LATEST_V2_PAIRS"
				}
			}
		],
		[
			{
				user: "{{user1}}",
				content: { text: "What are the new V2 pairs?" }
			},
			{
				user: "{{user2}}",
				content: {
					text: "Here are the most recent pairs created on Uniswap V2:",
					action: "LATEST_V2_PAIRS"
				}
			}
		],
		[
			{
				user: "{{user1}}",
				content: { text: "list v2 pairs" }
			},
			{
				user: "{{user2}}",
				content: {
					text: "Here are the latest Uniswap V2 pairs I found:",
					action: "LATEST_V2_PAIRS"
				}
			}
		]
	] as ActionExample[][]
};