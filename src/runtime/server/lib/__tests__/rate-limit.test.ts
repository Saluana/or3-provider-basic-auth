import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  enforceBasicAuthRateLimit,
  getBasicAuthRateLimitStoreSizeForTests,
  resetBasicAuthRateLimitStore
} from '../rate-limit';

function createEvent(input: { remoteAddress: string; headers?: Record<string, string> }) {
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
  } as any;
}

describe('basic-auth rate limit', () => {
  beforeEach(() => {
    vi.useRealTimers();
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
    } catch (error: any) {
      expect(error.statusCode).toBe(429);
    }
  });
});
