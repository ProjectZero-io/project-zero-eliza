import {PostgresDatabaseAdapter} from "@elizaos/adapter-postgres";

export interface Migration {
	version: number;
	name: string;
	up: (db: PostgresDatabaseAdapter) => Promise<void>;
	down: (db: PostgresDatabaseAdapter) => Promise<void>;
}
