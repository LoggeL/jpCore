import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { config } from '../config.js';
import * as schema from './schema.js';

const sqlite = new Database(config.databasePath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('synchronous = NORMAL');

export const db = drizzle(sqlite, { schema });
export const rawDb = sqlite;

export function runMigrations(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  migrate(db, { migrationsFolder: resolve(here, 'migrations') });
}

export function closeDb(): void {
  sqlite.close();
}

export type Db = typeof db;
export { schema };
