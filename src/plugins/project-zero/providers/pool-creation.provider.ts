import type {IAgentRuntime, Memory, Provider, State} from "@elizaos/core";
import {PostgresDatabaseAdapter} from "@elizaos/adapter-postgres";

export const poolCreationProvider: Provider = {
	get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
		try {
			const db = runtime.databaseAdapter as PostgresDatabaseAdapter;

			// Query to get new pool creations
			const result = await db.query(`
                WITH recent_blocks AS (
                    SELECT 
                        data->'uniswapV2'->'pairCreations' as v2_pairs,
                        data->'uniswapV3'->'poolCreations' as v3_pools
                    FROM uniswap
                    WHERE block_number >= (SELECT MAX(block_number) - 7200 FROM uniswap)
                ),
                new_pools AS (
                    SELECT 
                        jsonb_array_elements(v2_pairs || v3_pools) as pool_data
                    FROM recent_blocks
                )
                SELECT 
                    pool_data->>'address' as pool_address,
                    pool_data->>'token0' as token0,
                    pool_data->>'token1' as token1,
                    pool_data->>'blockTimestamp' as creation_time
                FROM new_pools
                ORDER BY CAST(pool_data->>'blockTimestamp' as INTEGER) DESC
                LIMIT 10;
            `);

			if (result.rows.length === 0) {
				return "No new pool creations detected in the last 24 hours.";
			}

			// Format the results
			const formattedPools = result.rows.map(pool => `
🆕 New Pool Created
📍 Address: ${pool.pool_address}
🔄 Pair: ${pool.token0} / ${pool.token1}
⏰ Created: ${new Date(parseInt(pool.creation_time) * 1000).toLocaleString()}
            `.trim()).join('\n\n');

			return formattedPools;
		} catch (error) {
			console.error("Pool creation provider error:", error);
			return "Unable to fetch new pool creations at this time.";
		}
	}
};