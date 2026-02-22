import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';
import {
  enforceBasicAuthRateLimit,
  getBasicAuthRateLimitStoreSizeForTests,
  resetBasicAuthRateLimitStore
} from '../rate-limit';
import { resetBasicAuthDbForTests } from '../../db/client';

function createEvent(input: { remoteAddress: string; headers?: Record<string, string> }): H3Event {
  const responseHeaders = new Map<string, string>();

  return {
    method: 'POST',
    node: {
      req: {
        headers: input.headers ?? {},
        socket: {
          remoteAddress: input.remoteAddress
        }
      },
      res: {
        setHeader(name: string, value: string) {
          responseHeaders.set(name.toLowerCase(), value);
        }
      }
    },
    context: {}
  } as unknown as H3Event;
}

describe('basic-auth rate limit', () => {
  beforeEach(() => {
    vi.useRealTimers();
    process.env.OR3_BASIC_AUTH_DB_PATH = ':memory:';
    delete process.env.OR3_BASIC_AUTH_RATE_LIMIT_BACKEND;
    resetBasicAuthDbForTests();
    resetBasicAuthRateLimitStore();
  });

  it('cleans up stale keys so memory usage stays bounded', () => {
    (globalThis as typeof globalThis & { useRuntimeConfig?: unknown }).useRuntimeConfig = () => ({
      security: {
        proxy: {
          trustProxy: false
        }
      }
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    for (let i = 0; i < 5; i += 1) {
      enforceBasicAuthRateLimit(
        createEvent({
          remoteAddress: `10.0.0.${i}`
        }),
        'basic-auth:sign-in'
      );
    }

    expect(getBasicAuthRateLimitStoreSizeForTests()).toBe(5);

    vi.setSystemTime(new Date('2026-01-01T00:02:00.000Z'));
    enforceBasicAuthRateLimit(
      createEvent({
        remoteAddress: '10.0.0.99'
      }),
      'basic-auth:sign-in'
    );

    expect(getBasicAuthRateLimitStoreSizeForTests()).toBe(1);
  });

  it('uses configured forwarded-for header when trustProxy is enabled', () => {
    (globalThis as typeof globalThis & { useRuntimeConfig?: unknown }).useRuntimeConfig = () => ({
      security: {
        proxy: {
          trustProxy: true,
          forwardedForHeader: 'x-real-ip'
        }
      }
    });

    for (let i = 0; i < 20; i += 1) {
      enforceBasicAuthRateLimit(
        createEvent({
          remoteAddress: `10.0.0.${i}`,
          headers: {
            'x-real-ip': '203.0.113.1'
          }
        }),
        'basic-auth:sign-in'
      );
    }

    try {
      enforceBasicAuthRateLimit(
        createEvent({
          remoteAddress: '10.0.0.250',
          headers: {
            'x-real-ip': '203.0.113.1'
          }
        }),
        'basic-auth:sign-in'
      );
      throw new Error('Expected rate limit error');
    } catch (error: unknown) {
      const h3Error = error as { statusCode?: number };
      expect(h3Error.statusCode).toBe(429);
      return;
    }

    expect(false).toBe(true);
  });
});
