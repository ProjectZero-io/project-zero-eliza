import type { IAgentRuntime, Memory, Provider, State } from "@elizaos/core";
import { PostgresDatabaseAdapter } from "@elizaos/adapter-postgres";

export const latestUniswapV2PairsProvider: Provider = {
	get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
		try {
			const db = runtime.databaseAdapter as PostgresDatabaseAdapter;

			const result = await db.query(`
                SELECT 
                    address,
                    token0,
                    token1,
                    block_number,
                    block_timestamp,
                    transaction_hash
                FROM uniswap_v2_pairs
                ORDER BY block_timestamp DESC
                LIMIT 5;
            `);

			if (result.rows.length === 0) {
				return "No Uniswap V2 pairs found in the database.";
			}

			// Format the results into a readable string
			const formattedPairs = result.rows.map(pair => `
📍 Pair Address: ${pair.address}
🔄 Tokens: ${pair.token0} / ${pair.token1}
🔢 Block: ${pair.block_number}
⏰ Created: ${new Date(pair.block_timestamp).toLocaleString()}
🔗 Tx: ${pair.transaction_hash}
            `.trim()).join('\n\n');

			return `Latest Uniswap V2 Pairs:\n\n${formattedPairs}`;
		} catch (error) {
			console.error("Latest Uniswap V2 pairs provider error:", error);
			return "Unable to fetch Uniswap V2 pairs at this time.";
		}
	}
};