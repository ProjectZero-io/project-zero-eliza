import type {Action, ActionExample, HandlerCallback, IAgentRuntime, Memory, State} from "@elizaos/core";
import {activeUniswapV3PoolsProvider} from "../providers/active-v3-pools.provider";

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
			// Get active pools from provider
			const poolsInfo = await activeUniswapV3PoolsProvider.get(runtime, message, state);

			if (typeof poolsInfo !== 'string') {
				await callback({
					text: "Error: Unexpected provider response format",
					action: "ACTIVE_V3_POOLS"
				});
				return false;
			}

			if (poolsInfo.includes("No pools met the activity criteria")) {
				await callback({
					text: "No pools met the high activity criteria in the last 24 hours (>$2M volume, >2000 trades, >1000 buys, >1000 sells)",
					action: "ACTIVE_V3_POOLS"
				});
				return true;
			}

			await callback({
				text: poolsInfo,
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
		],
		[
			{
				user: "{{user1}}",
				content: { text: "show top trading pools on v3" }
			},
			{
				user: "{{user2}}",
				content: {
					text: "Here are the most actively traded Uniswap V3 pools:",
					action: "ACTIVE_V3_POOLS"
				}
			}
		]
	] as ActionExample[][]
};