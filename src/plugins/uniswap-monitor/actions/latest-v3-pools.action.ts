import type {Action, ActionExample, HandlerCallback, IAgentRuntime, Memory, State} from "@elizaos/core";
import {latestUniswapV3PoolsProvider} from "../providers/latest-v3-pools.provider";
import {PoolCreation} from "../interfaces/uniswap.interfaces.ts";

const formatPools = (pools: PoolCreation[]): string => {
	const formattedPools = pools.map(pool => `
📍 Pool Address: ${pool.pool}
🔄 Tokens: ${pool.token0} / ${pool.token1}
💰 Fee Tier: ${pool.fee / 10000}% (${pool.fee} bps)
📊 Tick Spacing: ${pool.tickSpacing}
🔢 Block: ${pool.blockNumber}
🔗 Tx: ${pool.transactionHash}
⏰ Created: ${new Date(pool.blockTimestamp).toLocaleString()}
	`.trim()).join('\n\n');

	return `Latest Uniswap V3 Pools:\n\n${formattedPools}`;
};

export const latestV3PoolsAction: Action = {
	name: "LATEST_V3_POOLS",
	similes: ["SHOW_V3_POOLS", "GET_V3_POOLS", "LIST_V3_POOLS", "LATEST_UNISWAP_V3"],
	description: "Retrieves and displays the most recently created Uniswap V3 pools.",

	validate: async (_runtime: IAgentRuntime, message: Memory) => {
		const text = (message.content as { text: string }).text.toLowerCase();
		const triggers = [
			"v3 pools",
			"v3 pool",
			"uniswap v3",
			"latest pools",
			"new pools",
			"show pools",
			"list pools"
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
			const pools = await latestUniswapV3PoolsProvider.get(runtime, message, state);

			if (!pools) {
				await callback({
					text: "Sorry, I encountered an error while fetching the latest V3 pools. Please try again later.",
					action: "LATEST_V3_POOLS"
				});
				return false;
			}

			if (pools.length === 0) {
				await callback({
					text: "No recent Uniswap V3 pools found at this time.",
					action: "LATEST_V3_POOLS"
				});
				return true;
			}

			await callback({
				text: formatPools(pools),
				action: "LATEST_V3_POOLS"
			});

			return true;
		} catch (error) {
			console.error("Error in LATEST_V3_POOLS action:", error);
			await callback({
				text: "Sorry, I encountered an error while fetching the latest V3 pools. Please try again later.",
				action: "LATEST_V3_POOLS"
			});
			return false;
		}
	},

	examples: [
		[
			{
				user: "{{user1}}",
				content: { text: "Show me the latest Uniswap V3 pools" }
			},
			{
				user: "{{user2}}",
				content: {
					text: "Here are the latest Uniswap V3 pools:",
					action: "LATEST_V3_POOLS"
				}
			}
		],
		[
			{
				user: "{{user1}}",
				content: { text: "What are the new V3 pools?" }
			},
			{
				user: "{{user2}}",
				content: {
					text: "Here are the most recent pools created on Uniswap V3:",
					action: "LATEST_V3_POOLS"
				}
			}
		],
		[
			{
				user: "{{user1}}",
				content: { text: "list v3 pools" }
			},
			{
				user: "{{user2}}",
				content: {
					text: "Here are the latest Uniswap V3 pools I found:",
					action: "LATEST_V3_POOLS"
				}
			}
		]
	] as ActionExample[][]
};
