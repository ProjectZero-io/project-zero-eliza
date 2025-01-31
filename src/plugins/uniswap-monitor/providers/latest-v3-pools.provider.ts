import type {IAgentRuntime, Memory, Provider, State} from "@elizaos/core";
import {PostgresDatabaseAdapter} from "@elizaos/adapter-postgres";
import {PoolCreation} from "../interfaces/uniswap.interfaces.ts";

export const latestUniswapV3PoolsProvider: Provider = {
	get: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<PoolCreation[]> => {
		try {
			const db = runtime.databaseAdapter as PostgresDatabaseAdapter;

			const result = await db.query(`
                SELECT 
                    address,
                    token0,
                    token1,
                    fee,
                    tick_spacing,
                    block_number,
                    block_timestamp,
                    transaction_hash
                FROM uniswap_v3_pools
                ORDER BY block_timestamp DESC
                LIMIT 5;
            `);

			return result.rows.map(pool => ({
				pool: pool.address,
				token0: pool.token0,
				token1: pool.token1,
				fee: pool.fee,
				tickSpacing: pool.tick_spacing,
				blockNumber: pool.block_number,
				blockTimestamp: pool.block_timestamp,
				transactionHash: pool.transaction_hash
			}));
		} catch (error) {
			console.error("Latest Uniswap V3 pools provider error:", error);
			return null;
		}
	}
};
