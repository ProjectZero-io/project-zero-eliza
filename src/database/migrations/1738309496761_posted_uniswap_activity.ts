import {Migration} from "../database.interfaces.ts";

export const postedUniswapActivityMigration: Migration = {
	version: 5,
	name: 'posted_uniswap_activity_table',
	up: async (db) => {
		await db.query(`
			CREATE TABLE IF NOT EXISTS posted_uniswap_activity (
			    id SERIAL PRIMARY KEY,
			    address TEXT NOT NULL,
			    protocol TEXT NOT NULL CHECK (protocol IN ('v2', 'v3')),
			    first_posted_at TIMESTAMP NOT NULL DEFAULT NOW(),
			    token0 TEXT NOT NULL,
			    token1 TEXT NOT NULL,
			    trade_count INTEGER NOT NULL,
			    fee INTEGER, -- null for v2, not null for v3
			    UNIQUE(address)
			);
        `);
	},
	down: async (db) => {
		await db.query(`
            DROP TABLE IF EXISTS posted_uniswap_activity;
        `);
	}
};
