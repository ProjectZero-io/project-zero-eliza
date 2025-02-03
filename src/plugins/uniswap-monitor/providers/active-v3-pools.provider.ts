import type {IAgentRuntime, Memory, State} from "@elizaos/core";
import {PostgresDatabaseAdapter} from "@elizaos/adapter-postgres";
import {Blockchain, ExtendedProvider, PoolActivity} from "../interfaces/uniswap.interfaces.ts";

export const activeUniswapV3PoolsProvider: ExtendedProvider<PoolActivity> = {
	get: async (runtime: IAgentRuntime, _message: Memory, _state?: State, blockchain = Blockchain.ETHEREUM): Promise<PoolActivity[]> => {
		try {
			const db = runtime.databaseAdapter as PostgresDatabaseAdapter;
			const result = await db.query(`
                WITH last_24h_swaps AS (
                    SELECT 
                        pool,
                        COUNT(*) as total_swaps,
                        COUNT(CASE WHEN amount1 < 0 THEN 1 END) as buy_count,
                        COUNT(CASE WHEN amount0 < 0 THEN 1 END) as sell_count,
                        COALESCE(SUM(CASE 
                            WHEN amount0 > 0 THEN amount0
                            ELSE ABS(amount0)
                        END), 0) as token0_volume,
                        COALESCE(SUM(CASE 
                            WHEN amount1 > 0 THEN amount1
                            ELSE ABS(amount1)
                        END), 0) as token1_volume
                    FROM ${blockchain}_uniswap_v3_swaps
                    WHERE block_timestamp >= NOW() - INTERVAL '24 hours'
                    GROUP BY pool
                )
                SELECT 
                    p.address as pool_address,
                    p.token0,
                    p.token1,
                    p.fee,
                    COALESCE(s.total_swaps, 0) as total_swaps,
                    COALESCE(s.buy_count, 0) as buy_count,
                    COALESCE(s.sell_count, 0) as sell_count,
                    COALESCE(s.token0_volume, 0)::text as token0_volume,
                    COALESCE(s.token1_volume, 0)::text as token1_volume
                FROM ${blockchain}_uniswap_v3_pools p
                LEFT JOIN last_24h_swaps s ON s.pool = p.address
                WHERE s.total_swaps > 0
                ORDER BY s.total_swaps DESC
                LIMIT 10
            `);

			return result.rows;
		} catch (error) {
			console.error("Active Uniswap V3 pools provider error:", error);
			return [];
		}
	}
};
