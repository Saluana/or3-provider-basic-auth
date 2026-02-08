import { createError, getRequestHeader, setResponseHeader, type H3Event } from 'h3';

type Operation = 'basic-auth:sign-in' | 'basic-auth:refresh' | 'basic-auth:sign-out' | 'basic-auth:change-password';

interface RateLimitRule {
  windowMs: number;
  maxRequests: number;
}

interface Entry {
  timestamps: number[];
}

const RULES: Record<Operation, RateLimitRule> = {
  'basic-auth:sign-in': { windowMs: 60_000, maxRequests: 20 },
  'basic-auth:refresh': { windowMs: 60_000, maxRequests: 120 },
  'basic-auth:sign-out': { windowMs: 60_000, maxRequests: 60 },
  'basic-auth:change-password': { windowMs: 60_000, maxRequests: 20 }
};

const store = new Map<string, Entry>();

function getClientIp(event: H3Event): string {
  const runtimeConfig = useRuntimeConfig(event);
  const trustProxy = runtimeConfig.security?.proxy?.trustProxy === true;

  if (trustProxy) {
    const forwardedFor = getRequestHeader(event, 'x-forwarded-for');
    const firstIp = forwardedFor?.split(',')[0]?.trim();
    if (firstIp && firstIp.length > 0) {
      return firstIp;
    }
    return 'unknown';
  }

  return event.node.req.socket.remoteAddress ?? 'unknown';
}

function getKey(subject: string, operation: Operation): string {
  return `${subject}:${operation}`;
}

export function enforceBasicAuthRateLimit(event: H3Event, operation: Operation): void {
  const subject = getClientIp(event);
  const key = getKey(subject, operation);
  const now = Date.now();
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
}
