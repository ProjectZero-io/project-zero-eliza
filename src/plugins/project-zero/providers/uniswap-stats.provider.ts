import type {IAgentRuntime, Memory, Provider, State} from "@elizaos/core";
import {PostgresDatabaseAdapter} from "@elizaos/adapter-postgres";

export const uniswapStatsProvider: Provider = {
	get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
		try {
			const db = runtime.databaseAdapter as PostgresDatabaseAdapter;

			// Query to analyze pools and their stats in the last 24 hours
			const result = await db.query(`
                WITH pool_data AS (
                    SELECT 
                        data->>'blockNumber' as block_number,
                        data->'uniswapV2'->'swaps' as v2_swaps,
                        data->'uniswapV3'->'swaps' as v3_swaps,
                        data->'uniswapV2'->'pairCreations' as v2_pairs,
                        data->'uniswapV3'->'poolCreations' as v3_pools
                    FROM uniswap
                    WHERE block_number >= (SELECT MAX(block_number) - 7200 FROM uniswap) -- last ~24 hours (assuming 12s block time)
                ),
                pool_stats AS (
                    SELECT 
                        jsonb_array_elements(v2_swaps || v3_swaps) as swap,
                        jsonb_array_elements(v2_pairs || v3_pools) as pool_creation
                    FROM pool_data
                ),
                pool_metrics AS (
                    SELECT 
                        swap->>'to' as pool_address,
                        COUNT(*) as total_swaps,
                        COUNT(CASE WHEN CAST(swap->>'amount0Out' AS NUMERIC) > 0 THEN 1 END) as buy_count,
                        COUNT(CASE WHEN CAST(swap->>'amount1Out' AS NUMERIC) > 0 THEN 1 END) as sell_count,
                        SUM(CAST(swap->>'amount0In' AS NUMERIC) + CAST(swap->>'amount1In' AS NUMERIC)) as volume_raw
                    FROM pool_stats
                    GROUP BY pool_address
                    HAVING COUNT(*) > 2000  -- Minimum transaction requirement
                )
                SELECT 
                    pool_address,
                    total_swaps,
                    buy_count,
                    sell_count,
                    volume_raw,
                    total_swaps::float / 2000 as activity_ratio
                FROM pool_metrics
                WHERE buy_count > 1000 
                AND sell_count > 1000
                ORDER BY volume_raw DESC
                LIMIT 5;
            `);

			if (result.rows.length === 0) {
				return "No pools meeting the monitoring criteria in the last 24 hours.";
			}

			// Format the results
			const formattedStats = result.rows.map(pool => `
🏊‍♂️ Pool: ${pool.pool_address}
📊 Stats:
• Total Swaps: ${pool.total_swaps}
• Buy Transactions: ${pool.buy_count}
• Sell Transactions: ${pool.sell_count}
• Activity Ratio: ${(pool.activity_ratio * 100).toFixed(2)}%
            `.trim()).join('\n\n');

			return formattedStats;
		} catch (error) {
			console.error("Uniswap stats provider error:", error);
			return "Unable to fetch Uniswap statistics at this time.";
		}
	}
};