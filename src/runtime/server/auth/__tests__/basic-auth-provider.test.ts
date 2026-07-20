import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';
import { hashPassword } from '../../lib/password';
import { createAccount, createAuthSession, findSessionById } from '../../lib/session-store';
import {
  signAccessToken,
  signRefreshToken,
  hashRefreshToken
} from '../../lib/jwt';
import { basicAuthProvider } from '../basic-auth-provider';
import { resetBasicAuthDbForTests } from '../../db/client';

function applyRuntimeConfigStub() {
  (globalThis as typeof globalThis & { useRuntimeConfig?: unknown }).useRuntimeConfig = () => ({
    auth: {
      enabled: true,
      provider: 'basic-auth'
    },
    security: {
      proxy: {
        trustProxy: false
      }
    }
  });
}

function eventWithCookies(cookieHeader: string): H3Event {
  return {
    method: 'GET',
    node: {
      req: {
        headers: {
          cookie: cookieHeader
        },
        socket: {
          remoteAddress: '127.0.0.1'
        }
      },
      res: {
        getHeader: () => undefined,
        setHeader: vi.fn()
      }
    },
    context: {}
  } as unknown as H3Event;
}

describe('basicAuthProvider.getSession', () => {
  beforeEach(() => {
    process.env.OR3_BASIC_AUTH_DB_PATH = ':memory:';
    process.env.OR3_BASIC_AUTH_JWT_SECRET = 'jwt-secret';
    process.env.OR3_BASIC_AUTH_REFRESH_SECRET = 'refresh-secret';
    process.env.OR3_BASIC_AUTH_ACCESS_TTL_SECONDS = '900';
    process.env.OR3_BASIC_AUTH_REFRESH_TTL_SECONDS = '3600';
    process.env.OR3_BASIC_AUTH_ROTATION_GRACE_MS = '30000';
    resetBasicAuthDbForTests();
    applyRuntimeConfigStub();
  });

  it('resolves session from access cookie for active session', async () => {
    const account = createAccount({
      email: 'user@example.com',
      passwordHash: await hashPassword('password-1234'),
      displayName: 'Test User'
    });

    createAuthSession({
      accountId: account.id,
      sessionId: 'session-1',
      refreshTokenHash: hashRefreshToken('refresh-token-a'),
      expiresAtMs: Date.now() + 60_000
    });

    const accessToken = await signAccessToken({
      sub: account.id,
      sid: 'session-1',
      ver: account.token_version,
      email: account.email,
      display_name: account.display_name
    });

    const session = await basicAuthProvider.getSession(
      eventWithCookies(`or3_access=${accessToken}`)
    );

    expect(session?.provider).toBe('basic-auth');
    expect(session?.user.id).toBe(account.id);
    expect(session?.user.email).toBe('user@example.com');
  });

  it('transparently refreshes when access is missing but refresh cookie is valid', async () => {
    const account = createAccount({
      email: 'user@example.com',
      passwordHash: await hashPassword('password-1234'),
      displayName: 'Test User'
    });

    const sessionId = 'session-refreshable';
    const refreshToken = await signRefreshToken({
      sub: account.id,
      sid: sessionId,
      ver: account.token_version
    });

    createAuthSession({
      accountId: account.id,
      sessionId,
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAtMs: Date.now() + 60_000
    });

    const setHeader = vi.fn();
    const event = {
      method: 'GET',
      node: {
        req: {
          headers: {
            cookie: `or3_refresh=${refreshToken}`
          },
          socket: {
            remoteAddress: '127.0.0.1'
          }
        },
        res: {
          getHeader: () => undefined,
          setHeader
        }
      },
      context: {}
    } as unknown as H3Event;

    const session = await basicAuthProvider.getSession(event);

    expect(session?.provider).toBe('basic-auth');
    expect(session?.user.id).toBe(account.id);
    expect(findSessionById(sessionId)?.revoked_at).not.toBeNull();

    // Access cookie should have been written for the successor session.
    const setCookieCalls = setHeader.mock.calls.filter(
      (call) => call[0] === 'set-cookie' || call[0] === 'Set-Cookie'
    );
    expect(setCookieCalls.length).toBeGreaterThan(0);
  });

  it('returns null when neither access nor refresh cookies are usable', async () => {
    const session = await basicAuthProvider.getSession(eventWithCookies(''));
    expect(session).toBeNull();
  });
});
