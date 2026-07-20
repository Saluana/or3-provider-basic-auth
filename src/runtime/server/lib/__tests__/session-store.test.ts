import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPassword } from '../password';
import {
  createAccount,
  createAccountAndSession,
  createAuthSession,
  findAccountByEmail,
  findSessionById,
  isSessionUsable,
  rotateSession,
  updatePasswordAndRevokeSessions,
  revokeAllSessionsForAccount
} from '../session-store';
import { hashRefreshToken } from '../jwt';
import { resetBasicAuthDbForTests } from '../../db/client';

function applyRuntimeConfigStub() {
  (globalThis as typeof globalThis & { useRuntimeConfig?: unknown }).useRuntimeConfig = () => ({
    auth: {
      enabled: true,
      provider: 'basic-auth'
    }
  });
}

describe('session store', () => {
  beforeEach(() => {
    vi.useRealTimers();
    process.env.OR3_BASIC_AUTH_DB_PATH = ':memory:';
    process.env.OR3_BASIC_AUTH_JWT_SECRET = 'test-jwt-secret';
    process.env.OR3_BASIC_AUTH_REFRESH_SECRET = 'test-refresh-secret';
    resetBasicAuthDbForTests();
    applyRuntimeConfigStub();
  });

  it('rotates refresh sessions and revokes the old session', async () => {
    const account = createAccount({
      email: 'user@example.com',
      passwordHash: await hashPassword('pw-12345678')
    });

    const originalToken = 'refresh-token-a';
    createAuthSession({
      accountId: account.id,
      sessionId: 'sid-a',
      refreshTokenHash: hashRefreshToken(originalToken),
      expiresAtMs: Date.now() + 60_000
    });

    const result = rotateSession({
      currentSessionId: 'sid-a',
      currentRefreshHash: hashRefreshToken(originalToken),
      newSessionId: 'sid-b',
      newRefreshHash: hashRefreshToken('refresh-token-b'),
      newRefreshToken: 'refresh-token-b',
      newExpiresAtMs: Date.now() + 120_000
    });

    expect(result.ok).toBe(true);
    expect(findSessionById('sid-a')?.revoked_at).not.toBeNull();
    expect(isSessionUsable(findSessionById('sid-b'))).toBe(true);
  });

  it('rolls account creation back when session creation fails', async () => {
    const existing = createAccount({
      email: 'existing@example.com',
      passwordHash: await hashPassword('pw-12345678')
    });
    createAuthSession({
      accountId: existing.id,
      sessionId: 'duplicate-session-id',
      refreshTokenHash: hashRefreshToken('existing-refresh-token'),
      expiresAtMs: Date.now() + 60_000
    });

    expect(() =>
      createAccountAndSession({
        account: {
          id: 'new-account-id',
          email: 'new@example.com',
          passwordHash: 'new-password-hash'
        },
        session: {
          accountId: 'new-account-id',
          sessionId: 'duplicate-session-id',
          refreshTokenHash: hashRefreshToken('new-refresh-token'),
          expiresAtMs: Date.now() + 60_000
        }
      })
    ).toThrow();

    expect(findAccountByEmail('new@example.com')).toBeNull();
  });

  it('reuses successor tokens for concurrent refresh within the grace window', async () => {
    const account = createAccount({
      email: 'user@example.com',
      passwordHash: await hashPassword('pw-12345678')
    });

    const now = Date.now();
    createAuthSession({
      accountId: account.id,
      sessionId: 'sid-a',
      refreshTokenHash: hashRefreshToken('token-a'),
      expiresAtMs: now + 60_000
    });

    const first = rotateSession({
      currentSessionId: 'sid-a',
      currentRefreshHash: hashRefreshToken('token-a'),
      newSessionId: 'sid-b',
      newRefreshHash: hashRefreshToken('token-b'),
      newRefreshToken: 'token-b',
      newExpiresAtMs: now + 60_000,
      nowMs: now,
      graceMs: 30_000
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const concurrent = rotateSession({
      currentSessionId: 'sid-a',
      currentRefreshHash: hashRefreshToken('token-a'),
      newSessionId: 'sid-c',
      newRefreshHash: hashRefreshToken('token-c'),
      newRefreshToken: 'token-c',
      newExpiresAtMs: now + 60_000,
      nowMs: now + 1_000,
      graceMs: 30_000
    });

    expect(concurrent.ok).toBe(true);
    if (!concurrent.ok) return;
    expect(concurrent.reused).toBe(true);
    expect(concurrent.sessionId).toBe('sid-b');
    expect(concurrent.refreshToken).toBe('token-b');
    expect(isSessionUsable(findSessionById('sid-b'))).toBe(true);
    expect(findSessionById('sid-c')).toBeNull();
  });

  it('detects replay after the grace window and revokes all account sessions', async () => {
    const account = createAccount({
      email: 'user@example.com',
      passwordHash: await hashPassword('pw-12345678')
    });

    const now = Date.now();
    createAuthSession({
      accountId: account.id,
      sessionId: 'sid-a',
      refreshTokenHash: hashRefreshToken('token-a'),
      expiresAtMs: now + 60_000
    });

    const rotation = rotateSession({
      currentSessionId: 'sid-a',
      currentRefreshHash: hashRefreshToken('token-a'),
      newSessionId: 'sid-b',
      newRefreshHash: hashRefreshToken('token-b'),
      newRefreshToken: 'token-b',
      newExpiresAtMs: now + 60_000,
      nowMs: now,
      graceMs: 30_000
    });
    expect(rotation.ok).toBe(true);

    const replay = rotateSession({
      currentSessionId: 'sid-a',
      currentRefreshHash: hashRefreshToken('token-a'),
      newSessionId: 'sid-c',
      newRefreshHash: hashRefreshToken('token-c'),
      newRefreshToken: 'token-c',
      newExpiresAtMs: now + 60_000,
      nowMs: now + 31_000,
      graceMs: 30_000
    });

    expect(replay.ok).toBe(false);
    if (replay.ok) return;
    expect(replay.reason).toBe('replayed');

    expect(isSessionUsable(findSessionById('sid-b'))).toBe(false);
  });

  it('increments token version and revokes sessions after password changes', async () => {
    const account = createAccount({
      email: 'user@example.com',
      passwordHash: await hashPassword('pw-12345678')
    });

    createAuthSession({
      accountId: account.id,
      sessionId: 'sid-a',
      refreshTokenHash: hashRefreshToken('token-a'),
      expiresAtMs: Date.now() + 60_000
    });

    updatePasswordAndRevokeSessions(account.id, await hashPassword('new-password-123'));

    expect(isSessionUsable(findSessionById('sid-a'))).toBe(false);
  });

  it('revokes all sessions for an account', async () => {
    const account = createAccount({
      email: 'user@example.com',
      passwordHash: await hashPassword('pw-12345678')
    });

    createAuthSession({
      accountId: account.id,
      sessionId: 'sid-a',
      refreshTokenHash: hashRefreshToken('token-a'),
      expiresAtMs: Date.now() + 60_000
    });

    revokeAllSessionsForAccount(account.id);

    expect(isSessionUsable(findSessionById('sid-a'))).toBe(false);
  });
});
