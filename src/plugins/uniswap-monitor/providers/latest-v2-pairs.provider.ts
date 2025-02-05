import type {IAgentRuntime, Memory, Provider, State} from "@elizaos/core";
import {PostgresDatabaseAdapter} from "@elizaos/adapter-postgres";
import {Blockchain, PairCreation} from "../interfaces/uniswap.interfaces.ts";

export const latestUniswapV2PairsProvider: Provider = {
	get: async (runtime: IAgentRuntime, message: Memory, state?: State, blockchain = Blockchain.ETHEREUM): Promise<PairCreation[]> => {
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
                FROM ${blockchain}_uniswap_v2_pairs
                ORDER BY block_timestamp DESC
                LIMIT 5;
            `);

			return result.rows.map(row => ({
				pair: row.address,
				token0: row.token0,
				token1: row.token1,
				blockNumber: row.block_number,
				blockTimestamp: row.block_timestamp,
				transactionHash: row.transaction_hash
			}));
		} catch (error) {
			console.error("Latest Uniswap V2 pairs provider error:", error);
			return null;
		}
	}
};
