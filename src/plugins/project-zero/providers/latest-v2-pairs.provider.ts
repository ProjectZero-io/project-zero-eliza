import {IAgentRuntime, Memory, Provider, State, stringToUuid} from "@elizaos/core";
import {PairCreation} from "../interfaces/uniswap.interfaces.ts";

export const latestUniswapV2PairsProvider: Provider = {
	get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
		try {
			const memories = await runtime.messageManager.getMemories({
				roomId: stringToUuid('uniswap-v2-room'),
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
⏰ Created: ${new Date(pairData.blockTimestamp).toLocaleString()}
🔗 Tx: ${pairData.transactionHash}
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
