import { createError, setResponseHeader, type H3Event } from 'h3';
import {
  getClientIp as getProxyClientIp,
  normalizeProxyTrustConfig
} from './request-identity';

type Operation =
  | 'basic-auth:sign-in'
  | 'basic-auth:register'
  | 'basic-auth:refresh'
  | 'basic-auth:sign-out'
  | 'basic-auth:change-password';

interface RateLimitRule {
  windowMs: number;
  maxRequests: number;
}

interface Entry {
  timestamps: number[];
}

const RULES: Record<Operation, RateLimitRule> = {
  'basic-auth:sign-in': { windowMs: 60_000, maxRequests: 20 },
  'basic-auth:register': { windowMs: 60_000, maxRequests: 10 },
  'basic-auth:refresh': { windowMs: 60_000, maxRequests: 120 },
  'basic-auth:sign-out': { windowMs: 60_000, maxRequests: 60 },
  'basic-auth:change-password': { windowMs: 60_000, maxRequests: 20 }
};

const store = new Map<string, Entry>();
const MAX_WINDOW_MS = Math.max(...Object.values(RULES).map((rule) => rule.windowMs));
const SWEEP_INTERVAL_MS = 60_000;
let lastSweepAt = 0;

function getClientIp(event: H3Event): string {
  const runtimeConfig = useRuntimeConfig(event);
  const proxyConfig = normalizeProxyTrustConfig(runtimeConfig.security?.proxy);
  return getProxyClientIp(event, proxyConfig) ?? event.node.req.socket.remoteAddress ?? 'unknown';
}

function getKey(subject: string, operation: Operation): string {
  return `${subject}:${operation}`;
}

function pruneRateLimitStore(now: number): void {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) {
    return;
  }

  const cutoff = now - MAX_WINDOW_MS;
  for (const [key, entry] of store) {
    const recent = entry.timestamps.filter((timestamp) => timestamp > cutoff);
    if (recent.length === 0) {
      store.delete(key);
      continue;
    }

    entry.timestamps = recent;
  }

  lastSweepAt = now;
}

export function enforceBasicAuthRateLimit(event: H3Event, operation: Operation): void {
  const now = Date.now();
  pruneRateLimitStore(now);

  const subject = getClientIp(event);
  const key = getKey(subject, operation);
  const rule = RULES[operation];
  const windowStart = now - rule.windowMs;

  const current = store.get(key) ?? { timestamps: [] };
  const recent = current.timestamps.filter((timestamp) => timestamp > windowStart);

  if (recent.length >= rule.maxRequests) {
    const oldest = recent[0] ?? now;
    const retryAfterMs = Math.max(0, oldest + rule.windowMs - now);
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

    setResponseHeader(event, 'Retry-After', retryAfterSeconds);
    setResponseHeader(event, 'X-RateLimit-Limit', String(rule.maxRequests));
    setResponseHeader(event, 'X-RateLimit-Remaining', '0');

    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests'
    });
  }

  recent.push(now);
  store.set(key, { timestamps: recent });

  setResponseHeader(event, 'X-RateLimit-Limit', String(rule.maxRequests));
  setResponseHeader(
    event,
    'X-RateLimit-Remaining',
    String(Math.max(0, rule.maxRequests - recent.length))
  );
}

export function resetBasicAuthRateLimitStore(): void {
  store.clear();
  lastSweepAt = 0;
}

export function getBasicAuthRateLimitStoreSizeForTests(): number {
  return store.size;
}
