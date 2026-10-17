import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import env from './config.js';
mkdirSync(dirname(env.DATABASE_PATH), { recursive: true });
export const db = new Database(env.DATABASE_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS accounts (
 id TEXT PRIMARY KEY, did TEXT NOT NULL UNIQUE, handle TEXT NOT NULL,
 secret TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS pets (
 id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 name TEXT NOT NULL, personality TEXT NOT NULL, topics TEXT NOT NULL DEFAULT '',
 style TEXT NOT NULL DEFAULT '', interval_minutes INTEGER NOT NULL DEFAULT 120,
 enabled INTEGER NOT NULL DEFAULT 0, next_run_at TEXT, last_post_at TEXT,
 last_error TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS posts (
 id TEXT PRIMARY KEY, pet_id TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
 text TEXT NOT NULL, uri TEXT, cid TEXT, status TEXT NOT NULL,
 error TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS pets_due ON pets(enabled, next_run_at);
`);
export type Account = {id:string; did:string; handle:string; secret:string; token_hash:string};
export type Pet = {id:string; account_id:string; name:string; personality:string; topics:string; style:string; interval_minutes:number; enabled:number; next_run_at:string|null; last_post_at:string|null; last_error:string|null; created_at:string};
