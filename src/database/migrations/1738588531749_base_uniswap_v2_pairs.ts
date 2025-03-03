import {Migration} from "../database.interfaces.ts";

export const baseUniswapV2PairsMigration: Migration = {
	version: 6,
	name: 'base_uniswap_v2_pairs_table',
	up: async (db) => {
		await db.query(`
			CREATE TABLE IF NOT EXISTS base_uniswap_v2_pairs (
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
            DROP TABLE IF EXISTS base_uniswap_v2_pairs;
        `);
	}
};
