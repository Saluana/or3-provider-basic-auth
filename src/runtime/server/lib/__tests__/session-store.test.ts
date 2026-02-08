import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPassword } from '../password';
import {
  createAccount,
  createAuthSession,
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
      newExpiresAtMs: Date.now() + 120_000
    });

    expect(result.ok).toBe(true);
    expect(findSessionById('sid-a')?.revoked_at).not.toBeNull();
    expect(isSessionUsable(findSessionById('sid-b'))).toBe(true);
  });

  it('detects replay and revokes all account sessions', async () => {
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

    const rotation = rotateSession({
      currentSessionId: 'sid-a',
      currentRefreshHash: hashRefreshToken('token-a'),
      newSessionId: 'sid-b',
      newRefreshHash: hashRefreshToken('token-b'),
      newExpiresAtMs: Date.now() + 60_000
    });
    expect(rotation.ok).toBe(true);

    const replay = rotateSession({
      currentSessionId: 'sid-a',
      currentRefreshHash: hashRefreshToken('token-a'),
      newSessionId: 'sid-c',
      newRefreshHash: hashRefreshToken('token-c'),
      newExpiresAtMs: Date.now() + 60_000
    });

    expect(replay.ok).toBe(false);
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
