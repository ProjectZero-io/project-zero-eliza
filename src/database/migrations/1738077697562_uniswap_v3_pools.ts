import {Migration} from "../database.interfaces.ts";

export const uniswapV3PoolsMigration: Migration = {
	version: 3,
	name: 'uniswap_v3_pools_table',
	up: async (db) => {
		await db.query(`
            CREATE TABLE IF NOT EXISTS uniswap_v3_pools (
                address VARCHAR(42) PRIMARY KEY,
                token0 VARCHAR(42) NOT NULL,
                token1 VARCHAR(42) NOT NULL,
                fee INTEGER NOT NULL,
                tick_spacing INTEGER NOT NULL,
                block_number BIGINT NOT NULL,
                block_timestamp TIMESTAMP NOT NULL,
                transaction_hash VARCHAR(66) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
	},
	down: async (db) => {
		await db.query(`
            DROP TABLE IF EXISTS uniswap_v3_pools;
        `);
	}
};