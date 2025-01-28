import type { IAgentRuntime, Memory, Provider, State } from "@elizaos/core";
import { PostgresDatabaseAdapter } from "@elizaos/adapter-postgres";

export const latestUniswapV3PoolsProvider: Provider = {
	get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
		try {
			const db = runtime.databaseAdapter as PostgresDatabaseAdapter;

			// Query to get latest Uniswap V3 pools
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

			if (result.rows.length === 0) {
				return "No Uniswap V3 pools found in the database.";
			}

			// Format the results into a readable string
			const formattedPools = result.rows.map(pool => `
📍 Pool Address: ${pool.address}
🔄 Tokens: ${pool.token0} / ${pool.token1}
💰 Fee Tier: ${pool.fee / 10000}% (${pool.fee} bps)
📊 Tick Spacing: ${pool.tick_spacing}
🔢 Block: ${pool.block_number}
⏰ Created: ${new Date(pool.block_timestamp).toLocaleString()}
🔗 Tx: ${pool.transaction_hash}
            `.trim()).join('\n\n');

			return `Latest Uniswap V3 Pools:\n\n${formattedPools}`;
		} catch (error) {
			console.error("Latest Uniswap V3 pools provider error:", error);
			return "Unable to fetch Uniswap V3 pools at this time.";
		}
	}
};