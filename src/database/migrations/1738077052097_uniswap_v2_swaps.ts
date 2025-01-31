import {Migration} from "../database.interfaces.ts";

export const uniswapV2SwapsMigration: Migration = {
	version: 2,
	name: 'uniswap_v2_swaps_table',
	up: async (db) => {
		await db.query(`
            CREATE TABLE IF NOT EXISTS uniswap_v2_swaps (
                pair VARCHAR(42) NOT NULL,
                sender VARCHAR(42) NOT NULL,
                "to" VARCHAR(42) NOT NULL,
                amount0_in NUMERIC NOT NULL,
                amount1_in NUMERIC NOT NULL,
                amount0_out NUMERIC NOT NULL,
                amount1_out NUMERIC NOT NULL,
                block_number BIGINT NOT NULL,
                block_timestamp TIMESTAMP NOT NULL,
                transaction_hash VARCHAR(66) NOT NULL,
                log_index INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (transaction_hash, log_index)
            );

            CREATE INDEX idx_uniswap_v2_swaps_pair ON uniswap_v2_swaps(pair);
        `);
	},
	down: async (db) => {
		await db.query(`
            DROP TABLE IF EXISTS uniswap_v2_swaps;
        `);
	}
};