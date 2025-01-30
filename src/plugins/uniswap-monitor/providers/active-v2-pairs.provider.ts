import {IAgentRuntime, Memory, Provider, State} from "@elizaos/core";
import {SwapV2} from "../interfaces/uniswap.interfaces";
import {SWAPS_V2_ROOM} from "../constants.ts";

export const activeUniswapV2PairsProvider: Provider = {
	get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
		try {
			// Get last 24 hours of swap memories
			const swapMemories = await runtime.messageManager.getMemories({
				roomId: SWAPS_V2_ROOM,
				start: Date.now() - 24 * 60 * 60 * 1000
			});

			if (swapMemories.length === 0) {
				return "No swaps found in the last 24 hours.";
			}

			// Group swaps by pair and calculate metrics
			const pairMetrics = new Map<string, {
				volume: number;
				trades: number;
				buys: number;
				sells: number;
			}>();

			for (const memory of swapMemories) {
				const swaps = memory.content.swaps as SwapV2[];
				for (const swap of swaps) {
					const pairAddress = swap.pair.toLowerCase();

					if (!pairMetrics.has(pairAddress)) {
						pairMetrics.set(pairAddress, {
							volume: 0,
							trades: 0,
							buys: 0,
							sells: 0
						});
					}

					const metrics = pairMetrics.get(pairAddress)!;
					const isBuy = Number(swap.amount1In) > 0;

					// Assuming token1 is stable (e.g., USDC)
					const volume = isBuy ?
						Number(swap.amount1In) / 1e9 :
						Number(swap.amount1Out) / 1e18;

					metrics.volume += volume;
					metrics.trades += 1;
					if (isBuy) metrics.buys += 1;
					else metrics.sells += 1;
				}
			}

			// Filter high-activity pairs
			const activePairs = Array.from(pairMetrics.entries())
				.filter(([_, metrics]) =>
					metrics.volume >= 2_000_000 // $2M volume
					// && metrics.trades >= 200 &&      // 200 total trades
					// metrics.buys >= 100 &&        // 100 buys
					// metrics.sells >= 100         // 100 sells
				)
				.sort((a, b) => b[1].volume - a[1].volume); // Sort by volume

			if (activePairs.length === 0) {
				return "No pairs met the activity criteria in the last 24 hours.";
			}

			const pairStats = activePairs
				.map(([address, metrics]) => `
🏦 Pair: ${address}
💰 Volume: $${metrics.volume.toLocaleString()}
📊 Trades: ${metrics.trades.toLocaleString()}
📈 Buys: ${metrics.buys.toLocaleString()}
📉 Sells: ${metrics.sells.toLocaleString()}
                `.trim())
				.join('\n\n');

			return `Active Uniswap V2 Pairs (24h):\n${pairStats}`;

		} catch (error) {
			console.error("Active Uniswap V2 pairs provider error:", error);
			return "Unable to fetch active Uniswap V2 pairs at this time.";
		}
	}
};
