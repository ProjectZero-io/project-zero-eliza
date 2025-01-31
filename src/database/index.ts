import {PostgresDatabaseAdapter} from "@elizaos/adapter-postgres";
import {SqliteDatabaseAdapter} from "@elizaos/adapter-sqlite";
import Database from "better-sqlite3";
import path from "path";
import {elizaLogger} from "@elizaos/core";
import {uniswapV2PairsMigration} from "./migrations/1738073845549_uniswap_v2_pairs.ts";
import {uniswapV2SwapsMigration} from "./migrations/1738077052097_uniswap_v2_swaps.ts";
import {uniswapV3PoolsMigration} from "./migrations/1738077697562_uniswap_v3_pools.ts";
import {uniswapV3SwapsMigration} from "./migrations/1738077825899_uniswap_v3_swaps.ts";

const MIGRATIONS =[
  uniswapV2PairsMigration,
  uniswapV2SwapsMigration,
  uniswapV3PoolsMigration,
  uniswapV3SwapsMigration,
];

export async function runMigrations(
    db: PostgresDatabaseAdapter
) {
  await db.query(`
        CREATE TABLE IF NOT EXISTS migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

  const result = await db.query('SELECT version FROM migrations ORDER BY version DESC LIMIT 1');
  const currentVersion = result.rows.length > 0 ? result.rows[0].version : 0;

  for (const migration of MIGRATIONS.filter(m => m.version > currentVersion).sort((a, b) => a.version - b.version)) {
    elizaLogger.info(`Running migration ${migration.version}: ${migration.name}`);

    try {
      await migration.up(db);
      await db.query(
          'INSERT INTO migrations (version, name) VALUES ($1, $2)',
          [migration.version, migration.name]
      );
      elizaLogger.success(`Migration ${migration.version} completed`);
    } catch (error) {
      elizaLogger.error(`Migration ${migration.version} failed:`, error);
      throw error;
    }
  }
}

export async function initializeDatabase(dataDir: string) {
  if (process.env.POSTGRES_URL) {
    const db = new PostgresDatabaseAdapter({
      connectionString: process.env.POSTGRES_URL,
      schema: process.env.POSTGRES_SCHEMA ?? "public",
    });

    if (process.env.POSTGRES_RUN_MIGRATIONS) {
        await runMigrations(db);
    }

    return db;
  } else {
    const filePath =
      process.env.SQLITE_FILE ?? path.resolve(dataDir, "db.sqlite");
    // ":memory:";
    const db = new SqliteDatabaseAdapter(new Database(filePath));
    return db;
  }
}
