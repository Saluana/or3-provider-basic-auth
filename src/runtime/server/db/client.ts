import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import Database from 'better-sqlite3';
import { getBasicAuthConfig } from '../lib/config';

let dbSingleton: Database.Database | null = null;

function runMigrations(db: Database.Database): void {
  const versionRow = db.prepare('PRAGMA user_version').get() as
    | { user_version?: number }
    | undefined;
  const version = typeof versionRow?.user_version === 'number' ? versionRow.user_version : 0;

  if (version < 1) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS basic_auth_accounts (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        token_version INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS basic_auth_sessions (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        refresh_token_hash TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        revoked_at INTEGER,
        created_at INTEGER NOT NULL,
        rotated_from_session_id TEXT,
        replaced_by_session_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        FOREIGN KEY(account_id) REFERENCES basic_auth_accounts(id)
      );

      CREATE INDEX IF NOT EXISTS idx_basic_auth_sessions_account_id
        ON basic_auth_sessions(account_id);
      CREATE INDEX IF NOT EXISTS idx_basic_auth_sessions_expires_at
        ON basic_auth_sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_basic_auth_sessions_rotated_from
        ON basic_auth_sessions(rotated_from_session_id);
    `);
    db.pragma('user_version = 1');
  }
}

export function getBasicAuthDb(): Database.Database {
  if (dbSingleton) return dbSingleton;

  const config = getBasicAuthConfig();
  if (config.dbPath !== ':memory:') {
    mkdirSync(dirname(config.dbPath), { recursive: true });
  }

  const db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);

  dbSingleton = db;
  return dbSingleton;
}

export function resetBasicAuthDbForTests(): void {
  if (!dbSingleton) return;
  dbSingleton.close();
  dbSingleton = null;
}
