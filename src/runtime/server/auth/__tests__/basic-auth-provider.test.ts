import { beforeEach, describe, expect, it } from 'vitest';
import { hashPassword } from '../../lib/password';
import { createAccount, createAuthSession } from '../../lib/session-store';
import { signAccessToken, hashRefreshToken } from '../../lib/jwt';
import { basicAuthProvider } from '../basic-auth-provider';
import { resetBasicAuthDbForTests } from '../../db/client';

function applyRuntimeConfigStub() {
  (globalThis as typeof globalThis & { useRuntimeConfig?: unknown }).useRuntimeConfig = () => ({
    auth: {
      enabled: true,
      provider: 'basic-auth'
    }
  });
}

describe('basicAuthProvider.getSession', () => {
  beforeEach(() => {
    process.env.OR3_BASIC_AUTH_DB_PATH = ':memory:';
    process.env.OR3_BASIC_AUTH_JWT_SECRET = 'jwt-secret';
    process.env.OR3_BASIC_AUTH_REFRESH_SECRET = 'refresh-secret';
    process.env.OR3_BASIC_AUTH_ACCESS_TTL_SECONDS = '900';
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

    const event = {
      method: 'GET',
      node: {
        req: {
          headers: {
            cookie: `or3_access=${accessToken}`
          }
        }
      },
      context: {}
    } as any;

    const session = await basicAuthProvider.getSession(event);

    expect(session?.provider).toBe('basic-auth');
    expect(session?.user.id).toBe(account.id);
    expect(session?.user.email).toBe('user@example.com');
  });
});
