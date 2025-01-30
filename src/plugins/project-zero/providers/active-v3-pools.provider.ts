import {IAgentRuntime, Memory, Provider, State} from "@elizaos/core";
import {SwapV3} from "../interfaces/uniswap.interfaces";
import {SWAPS_V3_ROOM} from "../constants.ts";

export const activeUniswapV3PoolsProvider: Provider = {
	get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
		try {
			// Get last 24 hours of swap memories
			const swapMemories = await runtime.messageManager.getMemories({
				roomId: SWAPS_V3_ROOM,
				start: Date.now() - 24 * 60 * 60 * 1000
			});

			if (swapMemories.length === 0) {
				return "No swaps found in the last 24 hours.";
			}

			// Group swaps by pool and calculate metrics
			const poolMetrics = new Map<string, {
				volume: number;
				trades: number;
				buys: number;
				sells: number;
			}>();

			for (const memory of swapMemories) {
				const swaps = memory.content.swaps as SwapV3[];
				for (const swap of swaps) {
					const poolAddress = swap.pool.toLowerCase();

					if (!poolMetrics.has(poolAddress)) {
						poolMetrics.set(poolAddress, {
							volume: 0,
							trades: 0,
							buys: 0,
							sells: 0
						});
					}

					const metrics = poolMetrics.get(poolAddress)!;

					// In V3, amounts are signed: positive is tokens in, negative is tokens out
					// amount0 > 0 means selling token0 for token1
					const isSell = Number(swap.amount0) > 0;

					// Calculate volume using amount1 (assuming stable)
					// Need to use absolute value since amount can be negative
					const volume = Math.abs(Number(swap.amount1)) / 1e9;

					metrics.volume += volume;
					metrics.trades += 1;
					if (isSell) metrics.sells += 1;
					else metrics.buys += 1;
				}
			}

			// Filter high-activity pools
			const activePools = Array.from(poolMetrics.entries())
				.filter(([_, metrics]) =>
						metrics.volume >= 2_000_000 // $2M volume
					// && metrics.trades >= 200 &&      // 200 total trades
					// && metrics.buys >= 100 &&        // 100 buys
					// && metrics.sells >= 100         // 100 sells
				)
				.sort((a, b) => b[1].volume - a[1].volume); // Sort by volume

			if (activePools.length === 0) {
				return "No pools met the activity criteria in the last 24 hours.";
			}

			const poolStats = activePools
				.map(([address, metrics]) => `
🏦 Pool: ${address}
💰 Volume: $${metrics.volume.toLocaleString()}
📊 Trades: ${metrics.trades.toLocaleString()}
📈 Buys: ${metrics.buys.toLocaleString()}
📉 Sells: ${metrics.sells.toLocaleString()}
                `.trim())
				.join('\n\n');

			return `Active Uniswap V3 Pools (24h):\n${poolStats}`;

		} catch (error) {
			console.error("Active Uniswap V3 pools provider error:", error);
			return "Unable to fetch active Uniswap V3 pools at this time.";
		}
	}
};
