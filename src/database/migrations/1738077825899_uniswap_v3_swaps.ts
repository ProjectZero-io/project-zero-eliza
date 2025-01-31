import {Migration} from "../database.interfaces.ts";

export const uniswapV3SwapsMigration: Migration = {
	version: 4,
	name: 'uniswap_v3_swaps_table',
	up: async (db) => {
		await db.query(`
            CREATE TABLE IF NOT EXISTS uniswap_v3_swaps (
                pool VARCHAR(42) NOT NULL,
                sender VARCHAR(42) NOT NULL,
                recipient VARCHAR(42) NOT NULL,
                amount0 NUMERIC NOT NULL,
                amount1 NUMERIC NOT NULL,
                sqrt_price_x96 NUMERIC NOT NULL,
                liquidity NUMERIC NOT NULL,
                tick INTEGER NOT NULL,
                block_number BIGINT NOT NULL,
                block_timestamp TIMESTAMP NOT NULL,
                transaction_hash VARCHAR(66) NOT NULL,
                log_index INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (transaction_hash, log_index)
            );

            CREATE INDEX idx_uniswap_v3_swaps_pool ON uniswap_v3_swaps(pool);
        `);
	},
	down: async (db) => {
		await db.query(`
            DROP TABLE IF EXISTS uniswap_v3_swaps;
        `);
	}
};
