import { createError, getRequestHeader, type H3Event } from 'h3';
import { getProxyRequestHost, normalizeProxyTrustConfig } from './request-identity';

function getOriginHost(originOrReferer: string): string | null {
  try {
    return new URL(originOrReferer).host.toLowerCase();
  } catch {
    return null;
  }
}

function normalizeHost(host: string): string {
  return host.trim().toLowerCase();
}

function getRequestHost(event: H3Event): string | null {
  const runtimeConfig = useRuntimeConfig(event);
  const proxyConfig = normalizeProxyTrustConfig(runtimeConfig.security?.proxy);
  return getProxyRequestHost(event, proxyConfig);
}

function isSafeMethod(method?: string): boolean {
  const normalized = (method ?? 'GET').toUpperCase();
  return normalized === 'GET' || normalized === 'HEAD' || normalized === 'OPTIONS';
}

export function enforceMutationOriginPolicy(event: H3Event): void {
  if (isSafeMethod(event.method)) return;

  const originHeader =
    getRequestHeader(event, 'origin') ?? getRequestHeader(event, 'referer');

  // Allow non-browser clients with no Origin/Referer.
  if (!originHeader) return;

  const originHost = getOriginHost(originHeader);
  if (!originHost) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }

  const requestHost = getRequestHost(event);
  if (!requestHost) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }

  if (normalizeHost(originHost) !== normalizeHost(requestHost)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }
}
