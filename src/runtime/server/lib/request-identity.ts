import { getRequestHeader, type H3Event } from 'h3';

export type ForwardedForHeader = 'x-forwarded-for' | 'x-real-ip';
export type ForwardedHostHeader = 'x-forwarded-host';

export interface ProxyTrustConfig {
  trustProxy: boolean;
  forwardedForHeader: ForwardedForHeader;
  forwardedHostHeader: ForwardedHostHeader;
}

export interface ProxyTrustConfigInput {
  trustProxy?: boolean;
  forwardedForHeader?: string;
  forwardedHostHeader?: string;
}

const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$|^[0-9a-fA-F:.]+$/;

export function normalizeProxyTrustConfig(input?: ProxyTrustConfigInput): ProxyTrustConfig {
  return {
    trustProxy: input?.trustProxy === true,
    forwardedForHeader: input?.forwardedForHeader === 'x-real-ip' ? 'x-real-ip' : 'x-forwarded-for',
    forwardedHostHeader: 'x-forwarded-host'
  };
}

function parseForwardedFor(value: string): string | null {
  const firstIp = value.split(',')[0]?.trim();
  if (!firstIp) return null;
  if (!IP_REGEX.test(firstIp)) return null;
  return firstIp;
}

export function getClientIp(event: H3Event, config: ProxyTrustConfig): string | null {
  if (config.trustProxy) {
    const forwarded = getRequestHeader(event, config.forwardedForHeader);
    if (!forwarded) return null;
    return parseForwardedFor(forwarded);
  }

  return event.node.req.socket.remoteAddress ?? null;
}

export function getProxyRequestHost(event: H3Event, config: ProxyTrustConfig): string | null {
  if (config.trustProxy) {
    const forwardedHost = getRequestHeader(event, config.forwardedHostHeader);
    const firstHost = forwardedHost?.split(',')[0]?.trim().toLowerCase();
    return firstHost && firstHost.length > 0 ? firstHost : null;
  }

  const host = getRequestHeader(event, 'host');
  return host ? host.trim().toLowerCase() : null;
}
