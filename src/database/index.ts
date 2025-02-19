import {PostgresDatabaseAdapter} from "@elizaos/adapter-postgres";
import {SqliteDatabaseAdapter} from "@elizaos/adapter-sqlite";
import Database from "better-sqlite3";
import path from "path";
import {elizaLogger} from "@elizaos/core";
import {ethereumUniswapV2PairsMigration} from "./migrations/1738073845549_ethereum_uniswap_v2_pairs.ts";
import {ethereumUniswapV2SwapsMigration} from "./migrations/1738077052097_ethereum_uniswap_v2_swaps.ts";
import {ethereumUniswapV3PoolsMigration} from "./migrations/1738077697562_ethereum_uniswap_v3_pools.ts";
import {ethereumUniswapV3SwapsMigration} from "./migrations/1738077825899_ethereum_uniswap_v3_swaps.ts";
import {ethereumPostedUniswapActivityMigration} from "./migrations/1738309496761_ethereum_posted_uniswap_activity.ts";
import {baseUniswapV2PairsMigration} from "./migrations/1738588531749_base_uniswap_v2_pairs.ts";
import {baseUniswapV2SwapsMigration} from "./migrations/1738588569779_base_uniswap_v2_swaps.ts";
import {baseUniswapV3PoolsMigration} from "./migrations/1738588597941_base_uniswap_v3_pools.ts";
import {baseUniswapV3SwapsMigration} from "./migrations/1738588632294_base_uniswap_v3_swaps.ts";
import {basePostedUniswapActivityMigration} from "./migrations/1738588658938_base_posted_uniswap_activity.ts";

const MIGRATIONS =[
  ethereumUniswapV2PairsMigration,
  ethereumUniswapV2SwapsMigration,
  ethereumUniswapV3PoolsMigration,
  ethereumUniswapV3SwapsMigration,
  baseUniswapV2PairsMigration,
  baseUniswapV2SwapsMigration,
  baseUniswapV3PoolsMigration,
  baseUniswapV3SwapsMigration,
  ethereumPostedUniswapActivityMigration,
  basePostedUniswapActivityMigration,
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
