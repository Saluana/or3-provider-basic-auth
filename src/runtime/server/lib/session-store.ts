import { randomUUID, timingSafeEqual } from 'node:crypto';
import { getRequestHeader, type H3Event } from 'h3';
import type { BasicAuthAccount, BasicAuthSession } from '../db/schema';
import { getBasicAuthDb } from '../db/client';

export interface CreateAccountInput {
  email: string;
  passwordHash: string;
  displayName?: string | null;
}

export interface SessionMetadata {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface CreateSessionInput {
  accountId: string;
  sessionId: string;
  refreshTokenHash: string;
  expiresAtMs: number;
  rotatedFromSessionId?: string | null;
  metadata?: SessionMetadata;
}

export interface RotationInput {
  currentSessionId: string;
  currentRefreshHash: string;
  newSessionId: string;
  newRefreshHash: string;
  newExpiresAtMs: number;
  metadata?: SessionMetadata;
}

export interface RotationResult {
  ok: boolean;
  reason?: 'not_found' | 'expired' | 'revoked' | 'replayed';
  accountId?: string;
  sessionId?: string;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toHexBuffer(value: string): Buffer {
  return Buffer.from(value, 'hex');
}

function safeHexEquals(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  const leftBuffer = toHexBuffer(left);
  const rightBuffer = toHexBuffer(right);

  if (leftBuffer.length !== rightBuffer.length) return false;

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function getSessionMetadataFromEvent(event: H3Event): SessionMetadata {
  return {
    ipAddress: event.node.req.socket.remoteAddress ?? null,
    userAgent: getRequestHeader(event, 'user-agent') ?? null
  };
}

export function findAccountByEmail(email: string): BasicAuthAccount | null {
  const db = getBasicAuthDb();
  const row = db
    .prepare('SELECT * FROM basic_auth_accounts WHERE email = ? LIMIT 1')
    .get(normalizeEmail(email)) as BasicAuthAccount | undefined;
  return row ?? null;
}

export function findAccountById(id: string): BasicAuthAccount | null {
  const db = getBasicAuthDb();
  const row = db
    .prepare('SELECT * FROM basic_auth_accounts WHERE id = ? LIMIT 1')
    .get(id) as BasicAuthAccount | undefined;
  return row ?? null;
}

export function createAccount(input: CreateAccountInput): BasicAuthAccount {
  const db = getBasicAuthDb();
  const now = Date.now();

  const account: BasicAuthAccount = {
    id: randomUUID(),
    email: normalizeEmail(input.email),
    password_hash: input.passwordHash,
    display_name: input.displayName ?? null,
    token_version: 0,
    created_at: now,
    updated_at: now
  };

  db.prepare(
    `INSERT INTO basic_auth_accounts (
      id, email, password_hash, display_name, token_version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    account.id,
    account.email,
    account.password_hash,
    account.display_name,
    account.token_version,
    account.created_at,
    account.updated_at
  );

  return account;
}

export function ensureBootstrapAccount(input: CreateAccountInput): BasicAuthAccount {
  const existing = findAccountByEmail(input.email);
  if (existing) return existing;
  return createAccount(input);
}

export function createAuthSession(input: CreateSessionInput): BasicAuthSession {
  const db = getBasicAuthDb();
  const createdAt = Date.now();

  const row: BasicAuthSession = {
    id: input.sessionId,
    account_id: input.accountId,
    refresh_token_hash: input.refreshTokenHash,
    expires_at: input.expiresAtMs,
    revoked_at: null,
    created_at: createdAt,
    rotated_from_session_id: input.rotatedFromSessionId ?? null,
    replaced_by_session_id: null,
    ip_address: input.metadata?.ipAddress ?? null,
    user_agent: input.metadata?.userAgent ?? null
  };

  db.prepare(
    `INSERT INTO basic_auth_sessions (
      id, account_id, refresh_token_hash, expires_at, revoked_at, created_at,
      rotated_from_session_id, replaced_by_session_id, ip_address, user_agent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id,
    row.account_id,
    row.refresh_token_hash,
    row.expires_at,
    row.revoked_at,
    row.created_at,
    row.rotated_from_session_id,
    row.replaced_by_session_id,
    row.ip_address,
    row.user_agent
  );

  return row;
}

export function findSessionById(sessionId: string): BasicAuthSession | null {
  const db = getBasicAuthDb();
  const row = db
    .prepare('SELECT * FROM basic_auth_sessions WHERE id = ? LIMIT 1')
    .get(sessionId) as BasicAuthSession | undefined;
  return row ?? null;
}

export function revokeSessionById(sessionId: string, revokedAtMs = Date.now()): void {
  const db = getBasicAuthDb();
  db.prepare(
    'UPDATE basic_auth_sessions SET revoked_at = COALESCE(revoked_at, ?) WHERE id = ?'
  ).run(revokedAtMs, sessionId);
}

export function revokeAllSessionsForAccount(accountId: string, revokedAtMs = Date.now()): void {
  const db = getBasicAuthDb();
  db.prepare(
    'UPDATE basic_auth_sessions SET revoked_at = COALESCE(revoked_at, ?) WHERE account_id = ?'
  ).run(revokedAtMs, accountId);
}

export function rotateSession(input: RotationInput): RotationResult {
  const db = getBasicAuthDb();
  const now = Date.now();

  const currentSession = findSessionById(input.currentSessionId);
  if (!currentSession) {
    return { ok: false, reason: 'not_found' };
  }

  if (currentSession.expires_at <= now) {
    revokeSessionById(currentSession.id, now);
    return { ok: false, reason: 'expired' };
  }

  const isSameTokenHash = safeHexEquals(
    currentSession.refresh_token_hash,
    input.currentRefreshHash
  );

  if (currentSession.revoked_at !== null) {
    const replayedRotatedToken =
      currentSession.replaced_by_session_id !== null && isSameTokenHash;

    if (replayedRotatedToken) {
      revokeAllSessionsForAccount(currentSession.account_id, now);
      return {
        ok: false,
        reason: 'replayed'
      };
    }

    return { ok: false, reason: 'revoked' };
  }

  if (!isSameTokenHash) {
    revokeAllSessionsForAccount(currentSession.account_id, now);
    return {
      ok: false,
      reason: 'replayed'
    };
  }

  db.transaction(() => {
    createAuthSession({
      accountId: currentSession.account_id,
      sessionId: input.newSessionId,
      refreshTokenHash: input.newRefreshHash,
      expiresAtMs: input.newExpiresAtMs,
      rotatedFromSessionId: currentSession.id,
      metadata: input.metadata
    });

    db.prepare(
      'UPDATE basic_auth_sessions SET revoked_at = ?, replaced_by_session_id = ? WHERE id = ?'
    ).run(now, input.newSessionId, currentSession.id);
  })();

  return {
    ok: true,
    accountId: currentSession.account_id,
    sessionId: input.newSessionId
  };
}

export function updatePasswordAndRevokeSessions(accountId: string, newPasswordHash: string): void {
  const db = getBasicAuthDb();
  const now = Date.now();

  db.transaction(() => {
    db.prepare(
      `UPDATE basic_auth_accounts
       SET password_hash = ?, token_version = token_version + 1, updated_at = ?
       WHERE id = ?`
    ).run(newPasswordHash, now, accountId);

    revokeAllSessionsForAccount(accountId, now);
  })();
}

export function isSessionUsable(session: BasicAuthSession | null): boolean {
  if (!session) return false;
  if (session.revoked_at !== null) return false;
  if (session.expires_at <= Date.now()) return false;
  return true;
}
