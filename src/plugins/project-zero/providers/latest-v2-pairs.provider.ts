import {IAgentRuntime, Memory, Provider, State} from "@elizaos/core";
import {PairCreation} from "../interfaces/uniswap.interfaces.ts";
import {PAIRS_V2_ROOM} from "../constants.ts";

export const latestUniswapV2PairsProvider: Provider = {
	get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
		try {
			const memories = await runtime.messageManager.getMemories({
				roomId: PAIRS_V2_ROOM,
				count: 5,
				unique: true
			});

			if (memories.length === 0) {
				return "No recent Uniswap V2 pairs found at this time.";
			}

			const pairs = memories
				.map(memory => {
					const pairData = memory.content.pairData as PairCreation;

					return `
📍 Pair Address: ${pairData.pair}
🔄 Tokens: ${pairData.token0} / ${pairData.token1}
🔢 Block: ${pairData.blockNumber}
🔗 Tx: ${pairData.transactionHash}
⏰ Created: ${new Date(pairData.blockTimestamp).toLocaleString()}
					`.trim();
				})
				.join('\n\n');

			return `Latest Uniswap V2 Pairs: \n ${pairs}`;

		} catch (error) {
			console.error("Latest Uniswap V2 pairs provider error:", error);
			return "Unable to fetch Uniswap V2 pairs at this time.";
		}
	}
};
