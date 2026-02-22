import { dirname } from 'node:path';
import { chmodSync, mkdirSync } from 'node:fs';
import Database from 'better-sqlite3';
import { getBasicAuthConfig } from '../lib/config';

let dbSingleton: Database.Database | null = null;
const DB_DIR_MODE = 0o700;
const DB_FILE_MODE = 0o600;

function hardenDbDirectoryPermissions(dbPath: string): void {
  if (dbPath === ':memory:' || process.platform === 'win32') return;
  const dir = dirname(dbPath);
  mkdirSync(dir, { recursive: true, mode: DB_DIR_MODE });
  chmodSync(dir, DB_DIR_MODE);
}

function hardenDbFilePermissions(dbPath: string): void {
  if (dbPath === ':memory:' || process.platform === 'win32') return;
  chmodSync(dbPath, DB_FILE_MODE);
}

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

  if (version < 2) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS basic_auth_rate_limits (
        key TEXT PRIMARY KEY,
        subject TEXT NOT NULL,
        operation TEXT NOT NULL,
        window_started_at INTEGER NOT NULL,
        request_count INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_basic_auth_rate_limits_updated_at
        ON basic_auth_rate_limits(updated_at);
    `);
    db.pragma('user_version = 2');
  }
}

export function getBasicAuthDb(): Database.Database {
  if (dbSingleton) return dbSingleton;

  const config = getBasicAuthConfig();
  if (config.dbPath !== ':memory:') {
    try {
      hardenDbDirectoryPermissions(config.dbPath);
    } catch (error) {
      throw new Error(
        `[basic-auth] Failed to secure DB directory permissions for "${dirname(config.dbPath)}": ${
          (error as Error).message
        }`
      );
    }
  }

  const db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  if (config.dbPath !== ':memory:') {
    try {
      hardenDbFilePermissions(config.dbPath);
    } catch (error) {
      db.close();
      throw new Error(
        `[basic-auth] Failed to secure DB file permissions for "${config.dbPath}": ${
          (error as Error).message
        }`
      );
    }
  }

  runMigrations(db);

  dbSingleton = db;
  return dbSingleton;
}

export function resetBasicAuthDbForTests(): void {
  if (!dbSingleton) return;
  dbSingleton.close();
  dbSingleton = null;
}
