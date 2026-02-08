import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  getAccessTokenFromEvent,
  hashRefreshToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
} from '../jwt';

function applyRuntimeConfigStub() {
  (globalThis as typeof globalThis & { useRuntimeConfig?: unknown }).useRuntimeConfig = () => ({
    auth: {
      enabled: true,
      provider: 'basic-auth'
    }
  });
}

describe('jwt helpers', () => {
  beforeEach(() => {
    vi.useRealTimers();
    process.env.OR3_BASIC_AUTH_JWT_SECRET = 'test-jwt-secret';
    process.env.OR3_BASIC_AUTH_REFRESH_SECRET = 'test-refresh-secret';
    process.env.OR3_BASIC_AUTH_ACCESS_TTL_SECONDS = '1';
    process.env.OR3_BASIC_AUTH_REFRESH_TTL_SECONDS = '10';
    process.env.OR3_BASIC_AUTH_DB_PATH = ':memory:';
    applyRuntimeConfigStub();
  });

  it('signs and verifies access tokens', async () => {
    const token = await signAccessToken({
      sub: 'user-1',
      sid: 'session-1',
      ver: 0,
      email: 'user@example.com'
    });

    const claims = await verifyAccessToken(token);

    expect(claims?.sub).toBe('user-1');
    expect(claims?.sid).toBe('session-1');
    expect(claims?.ver).toBe(0);
    expect(claims?.typ).toBe('access');
  });

  it('rejects access token after expiry', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const token = await signAccessToken({
      sub: 'user-1',
      sid: 'session-1',
      ver: 0
    });

    vi.setSystemTime(new Date('2026-01-01T00:00:02.000Z'));

    await expect(verifyAccessToken(token)).resolves.toBeNull();
  });

  it('signs and verifies refresh tokens', async () => {
    const token = await signRefreshToken({
      sub: 'user-1',
      sid: 'session-1',
      ver: 2
    });

    const claims = await verifyRefreshToken(token);

    expect(claims?.sub).toBe('user-1');
    expect(claims?.sid).toBe('session-1');
    expect(claims?.ver).toBe(2);
    expect(claims?.typ).toBe('refresh');
    expect(typeof claims?.jti).toBe('string');
  });

  it('rejects refresh tokens signed with another secret', async () => {
    const token = await signRefreshToken({
      sub: 'user-1',
      sid: 'session-1',
      ver: 0
    });

    process.env.OR3_BASIC_AUTH_REFRESH_SECRET = 'different-secret';

    await expect(verifyRefreshToken(token)).resolves.toBeNull();
  });

  it('rejects tokens signed with unsupported algorithms', async () => {
    const token = jwt.sign(
      {
        sid: 'session-1',
        ver: 0,
        typ: 'access'
      },
      process.env.OR3_BASIC_AUTH_JWT_SECRET!,
      {
        algorithm: 'HS384',
        subject: 'user-1',
        expiresIn: 60
      }
    );

    await expect(verifyAccessToken(token)).resolves.toBeNull();
  });

  it('extracts access token from cookie header', () => {
    const event = {
      node: {
        req: {
          headers: {
            cookie: 'or3_access=token-123; other=value'
          }
        }
      }
    } as any;

    expect(getAccessTokenFromEvent(event)).toBe('token-123');
  });

  it('hashes refresh tokens deterministically', () => {
    const first = hashRefreshToken('abc123');
    const second = hashRefreshToken('abc123');

    expect(first).toBe(second);
    expect(first).toHaveLength(64);
  });
});
