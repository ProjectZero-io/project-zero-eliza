import {Migration} from "../database.interfaces.ts";

export const ethereumUniswapV2PairsMigration: Migration = {
	version: 1,
	name: 'ethereum_uniswap_v2_pairs_table',
	up: async (db) => {
		await db.query(`
			CREATE TABLE IF NOT EXISTS ethereum_uniswap_v2_pairs (
			    address VARCHAR(42) PRIMARY KEY,
			    token0 VARCHAR(42) NOT NULL,
			    token1 VARCHAR(42) NOT NULL,
			    block_number BIGINT NOT NULL,
			    block_timestamp TIMESTAMP NOT NULL,
			    transaction_hash VARCHAR(66) NOT NULL,
			    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
        `);
	},
	down: async (db) => {
		await db.query(`
            DROP TABLE IF EXISTS ethereum_uniswap_v2_pairs;
        `);
	}
};
