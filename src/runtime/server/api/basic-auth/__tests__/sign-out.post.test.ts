import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp, eventHandler, toNodeListener } from 'h3';
import { resetBasicAuthRateLimitStore } from '../../../lib/rate-limit';
import { resetBasicAuthDbForTests } from '../../../db/client';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../../../../lib/constants';
import { handleSignOut } from '../sign-out.post';
import { hashRefreshToken, signAccessToken, signRefreshToken } from '../../../lib/jwt';
import { createAccountAndSession, findSessionById, rotateSession } from '../../../lib/session-store';
import {
  __resetRevokeHostActivationsForUserCalls,
  __revokeHostActivationsForUserCalls,
} from '../../../../../test-shims/server-isolation-activation-registry';

vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({
    auth: {
      enabled: true,
      provider: 'basic-auth',
    },
    public: {
      sync: {
        provider: 'sqlite',
      },
    },
    security: {
      proxy: {
        trustProxy: false,
      },
    },
  }),
}));

interface SeededSession {
  accountId: string;
  sessionId: string;
  accessToken: string;
  refreshToken: string;
}

async function seedSession(): Promise<SeededSession> {
  const accountId = randomUUID();
  const sessionId = randomUUID();
  const refreshToken = await signRefreshToken({ sub: accountId, sid: sessionId, ver: 0 });
  const accessToken = await signAccessToken({
    sub: accountId,
    sid: sessionId,
    ver: 0,
    email: `${accountId}@example.com`,
  });

  createAccountAndSession({
    account: {
      id: accountId,
      email: `${accountId}@example.com`,
      passwordHash: 'hash',
    },
    session: {
      accountId,
      sessionId,
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAtMs: Date.now() + 3_600_000,
    },
  });

  return { accountId, sessionId, accessToken, refreshToken };
}

function authCookies(session: SeededSession, includeAccess = true): Record<string, string> {
  const parts = [`${REFRESH_COOKIE_NAME}=${session.refreshToken}`];
  if (includeAccess) {
    parts.unshift(`${ACCESS_COOKIE_NAME}=${session.accessToken}`);
  }
  return { cookie: parts.join('; ') };
}

function setAuthCookieValues(response: Response): string[] {
  return response.headers
    .getSetCookie()
    .filter(
      (cookie) =>
        cookie.startsWith(`${ACCESS_COOKIE_NAME}=`) ||
        cookie.startsWith(`${REFRESH_COOKIE_NAME}=`)
    )
    .map((cookie) => cookie.slice(cookie.indexOf('=') + 1).split(';')[0]);
}

describe('basic-auth sign-out portable teardown', () => {
  let server: ReturnType<typeof createServer> | null = null;
  let baseUrl = '';

  beforeEach(async () => {
    resetBasicAuthRateLimitStore();
    resetBasicAuthDbForTests();
    __resetRevokeHostActivationsForUserCalls();

    process.env.OR3_BASIC_AUTH_DB_PATH = ':memory:';
    process.env.OR3_BASIC_AUTH_JWT_SECRET = 'jwt-secret';
    process.env.OR3_BASIC_AUTH_REFRESH_SECRET = 'refresh-secret';
    process.env.OR3_BASIC_AUTH_ACCESS_TTL_SECONDS = '900';
    process.env.OR3_BASIC_AUTH_REFRESH_TTL_SECONDS = '3600';

    const app = createApp();
    app.use('/api/basic-auth/sign-out', eventHandler(handleSignOut));
    server = createServer(toNodeListener(app));
    await new Promise<void>((resolve) => {
      server!.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    if (server) {
      const activeServer = server;
      await new Promise<void>((resolve, reject) => {
        activeServer.close((error) => {
          if (error) reject(error);
          else resolve();
        });
        activeServer.closeAllConnections();
      });
    }
    server = null;
    baseUrl = '';
  });

  it('revokes the signing-out user portable activations and session', async () => {
    const session = await seedSession();

    const response = await fetch(`${baseUrl}/api/basic-auth/sign-out`, {
      method: 'POST',
      headers: authCookies(session),
    });

    expect(response.status).toBe(200);
    // The host registry (stubbed here) receives the authoritative revocation;
    // its abort-on-revoke behavior is covered by the host test suite.
    expect(__revokeHostActivationsForUserCalls()).toEqual([
      { userId: session.accountId, reason: 'logout' },
    ]);
    expect(findSessionById(session.sessionId)?.revoked_at).not.toBeNull();
    const cleared = setAuthCookieValues(response);
    expect(cleared.length).toBeGreaterThan(0);
    expect(cleared.every((value) => value === '')).toBe(true);
  });

  it('still signs out when no session resolves', async () => {
    const response = await fetch(`${baseUrl}/api/basic-auth/sign-out`, {
      method: 'POST',
    });
    expect(response.status).toBe(200);
    expect(__revokeHostActivationsForUserCalls()).toEqual([]);
  });

  it('does not refresh the session, so logout revokes the rotated successor', async () => {
    const session = await seedSession();
    const successorId = randomUUID();
    const successorRefreshToken = await signRefreshToken({
      sub: session.accountId,
      sid: successorId,
      ver: 0,
    });
    expect(
      rotateSession({
        currentSessionId: session.sessionId,
        currentRefreshHash: hashRefreshToken(session.refreshToken),
        newSessionId: successorId,
        newRefreshHash: hashRefreshToken(successorRefreshToken),
        newRefreshToken: successorRefreshToken,
        newExpiresAtMs: Date.now() + 3_600_000,
      }).ok
    ).toBe(true);
    expect(findSessionById(session.sessionId)?.rotation_grace_until).not.toBeNull();

    // Only the stale predecessor refresh cookie is presented: sign-out must not
    // mint a successor session and must revoke the successor and its grace.
    const response = await fetch(`${baseUrl}/api/basic-auth/sign-out`, {
      method: 'POST',
      headers: authCookies(session, false),
    });

    expect(response.status).toBe(200);
    const cleared = setAuthCookieValues(response);
    expect(cleared.length).toBeGreaterThan(0);
    expect(cleared.every((value) => value === '')).toBe(true);
    expect(findSessionById(successorId)?.revoked_at).not.toBeNull();
    expect(findSessionById(session.sessionId)?.rotation_grace_until).toBeNull();
    expect(findSessionById(session.sessionId)?.rotation_grace_refresh_token).toBeNull();
    expect(__revokeHostActivationsForUserCalls()).toEqual([
      { userId: session.accountId, reason: 'logout' },
    ]);

    // Replaying the rotated predecessor cannot recover the revoked successor.
    expect(
      rotateSession({
        currentSessionId: session.sessionId,
        currentRefreshHash: hashRefreshToken(session.refreshToken),
        newSessionId: randomUUID(),
        newRefreshHash: hashRefreshToken('replay-attempt'),
        newRefreshToken: 'replay-attempt',
        newExpiresAtMs: Date.now() + 3_600_000,
      }).ok
    ).toBe(false);
  });
});
