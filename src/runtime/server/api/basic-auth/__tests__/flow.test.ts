import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp, eventHandler, toNodeListener } from 'h3';
import { hashPassword } from '../../../lib/password';
import { createAccount } from '../../../lib/session-store';
import { resetBasicAuthDbForTests } from '../../../db/client';
import { resetBasicAuthRateLimitStore } from '../../../lib/rate-limit';
import { handleSignIn } from '../sign-in.post';
import { handleRefresh } from '../refresh.post';
import { handleSignOut } from '../sign-out.post';
import { handleChangePassword } from '../change-password.post';
import { basicAuthProvider } from '../../../auth/basic-auth-provider';

type CookieJar = Map<string, string>;

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

function getSetCookies(response: Response): string[] {
  const headerBag = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headerBag.getSetCookie === 'function') {
    return headerBag.getSetCookie();
  }

  const single = response.headers.get('set-cookie');
  return single ? [single] : [];
}

function applySetCookies(jar: CookieJar, setCookies: string[]): void {
  for (const cookie of setCookies) {
    const [pair] = cookie.split(';');
    if (!pair) continue;
    const [name, value] = pair.split('=');
    if (!name) continue;

    if (!value || value.length === 0) {
      jar.delete(name.trim());
      continue;
    }

    jar.set(name.trim(), value);
  }
}

function toCookieHeader(jar: CookieJar): string {
  return Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

describe('basic-auth endpoint flow', () => {
  let server: ReturnType<typeof createServer> | null = null;
  let baseUrl = '';

  beforeEach(async () => {
    resetBasicAuthRateLimitStore();
    resetBasicAuthDbForTests();

    process.env.OR3_BASIC_AUTH_DB_PATH = ':memory:';
    process.env.OR3_BASIC_AUTH_JWT_SECRET = 'jwt-secret';
    process.env.OR3_BASIC_AUTH_REFRESH_SECRET = 'refresh-secret';
    process.env.OR3_BASIC_AUTH_ACCESS_TTL_SECONDS = '900';
    process.env.OR3_BASIC_AUTH_REFRESH_TTL_SECONDS = '3600';

    applyRuntimeConfigStub();

    createAccount({
      email: 'user@example.com',
      passwordHash: await hashPassword('password-1234'),
      displayName: 'Example User'
    });

    const app = createApp();
    app.use('/api/basic-auth/sign-in', eventHandler(handleSignIn));
    app.use('/api/basic-auth/refresh', eventHandler(handleRefresh));
    app.use('/api/basic-auth/sign-out', eventHandler(handleSignOut));
    app.use('/api/basic-auth/change-password', eventHandler(handleChangePassword));
    app.use(
      '/api/auth/session',
      eventHandler(async (event) => {
        const session = await basicAuthProvider.getSession(event);
        return { session };
      })
    );

    server = createServer(toNodeListener(app));
    await new Promise<void>((resolve) => {
      server!.listen(0, '127.0.0.1', () => resolve());
    });

    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
    server = null;
    baseUrl = '';
  });

  it('sign-in -> session resolution flow works', async () => {
    const jar: CookieJar = new Map();

    const signInResponse = await fetch(`${baseUrl}/api/basic-auth/sign-in`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: baseUrl
      },
      body: JSON.stringify({ email: 'user@example.com', password: 'password-1234' })
    });

    expect(signInResponse.status).toBe(200);
    applySetCookies(jar, getSetCookies(signInResponse));

    const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
      headers: {
        cookie: toCookieHeader(jar)
      }
    });

    const payload = await sessionResponse.json();
    expect(payload.session?.provider).toBe('basic-auth');
    expect(payload.session?.user?.email).toBe('user@example.com');
  });

  it('refresh rotates sessions and replay of old refresh token is rejected', async () => {
    const jar: CookieJar = new Map();

    const signIn = await fetch(`${baseUrl}/api/basic-auth/sign-in`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: baseUrl
      },
      body: JSON.stringify({ email: 'user@example.com', password: 'password-1234' })
    });

    applySetCookies(jar, getSetCookies(signIn));
    const previousRefresh = jar.get('or3_refresh');

    const refresh = await fetch(`${baseUrl}/api/basic-auth/refresh`, {
      method: 'POST',
      headers: {
        cookie: toCookieHeader(jar),
        origin: baseUrl
      }
    });

    expect(refresh.status).toBe(200);
    applySetCookies(jar, getSetCookies(refresh));
    expect(jar.get('or3_refresh')).not.toBe(previousRefresh);

    const replay = await fetch(`${baseUrl}/api/basic-auth/refresh`, {
      method: 'POST',
      headers: {
        cookie: `or3_refresh=${previousRefresh}`,
        origin: baseUrl
      }
    });

    expect(replay.status).toBe(401);
  });

  it('change-password revokes the current session', async () => {
    const jar: CookieJar = new Map();

    const signIn = await fetch(`${baseUrl}/api/basic-auth/sign-in`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: baseUrl
      },
      body: JSON.stringify({ email: 'user@example.com', password: 'password-1234' })
    });

    applySetCookies(jar, getSetCookies(signIn));
    const oldCookieHeader = toCookieHeader(jar);

    const changePassword = await fetch(`${baseUrl}/api/basic-auth/change-password`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: oldCookieHeader,
        origin: baseUrl
      },
      body: JSON.stringify({
        currentPassword: 'password-1234',
        newPassword: 'new-password-1234',
        confirmNewPassword: 'new-password-1234'
      })
    });

    expect(changePassword.status).toBe(200);

    const sessionAfterChange = await fetch(`${baseUrl}/api/auth/session`, {
      headers: {
        cookie: oldCookieHeader
      }
    });

    const payload = await sessionAfterChange.json();
    expect(payload.session).toBeNull();
  });
});
