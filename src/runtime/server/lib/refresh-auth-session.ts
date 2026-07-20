import { randomUUID } from 'node:crypto';
import type { H3Event } from 'h3';
import { clearAuthCookies, setAccessCookie, setRefreshCookie } from './cookies';
import { getBasicAuthConfig } from './config';
import {
  getRefreshTokenFromEvent,
  hashRefreshToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from './jwt';
import {
  findAccountById,
  getSessionMetadataFromEvent,
  rotateSession
} from './session-store';
import type { BasicAuthAccount } from '../db/schema';

export type RefreshAuthSessionFailureReason =
  | 'missing_token'
  | 'invalid_token'
  | 'account'
  | 'not_found'
  | 'expired'
  | 'revoked'
  | 'replayed';

export type RefreshAuthSessionResult =
  | {
      ok: true;
      account: BasicAuthAccount;
      sessionId: string;
      accessToken: string;
      refreshToken: string;
      reused: boolean;
    }
  | {
      ok: false;
      reason: RefreshAuthSessionFailureReason;
    };

/**
 * Rotate (or grace-reuse) the refresh session for this request and mint a fresh
 * access token. Does not set cookies — callers decide whether to write them.
 */
export async function refreshAuthSession(event: H3Event): Promise<RefreshAuthSessionResult> {
  const refreshToken = getRefreshTokenFromEvent(event);
  if (!refreshToken) {
    return { ok: false, reason: 'missing_token' };
  }

  const claims = await verifyRefreshToken(refreshToken);
  if (!claims) {
    return { ok: false, reason: 'invalid_token' };
  }

  const account = findAccountById(claims.sub);
  if (!account || account.token_version !== claims.ver) {
    return { ok: false, reason: 'account' };
  }

  const config = getBasicAuthConfig();
  const newSessionId = randomUUID();
  const newRefreshToken = await signRefreshToken({
    sub: account.id,
    sid: newSessionId,
    ver: account.token_version
  });

  const rotation = rotateSession({
    currentSessionId: claims.sid,
    currentRefreshHash: hashRefreshToken(refreshToken),
    newSessionId,
    newRefreshHash: hashRefreshToken(newRefreshToken),
    newRefreshToken,
    newExpiresAtMs: Date.now() + config.refreshTtlSeconds * 1000,
    graceMs: config.rotationGraceMs,
    metadata: getSessionMetadataFromEvent(event)
  });

  if (!rotation.ok || rotation.accountId !== account.id) {
    return {
      ok: false,
      reason: rotation.ok ? 'account' : rotation.reason
    };
  }

  const effectiveRefreshToken =
    rotation.reused && rotation.refreshToken ? rotation.refreshToken : newRefreshToken;
  const effectiveSessionId = rotation.sessionId;

  const accessToken = await signAccessToken({
    sub: account.id,
    sid: effectiveSessionId,
    ver: account.token_version,
    email: account.email,
    display_name: account.display_name
  });

  return {
    ok: true,
    account,
    sessionId: effectiveSessionId,
    accessToken,
    refreshToken: effectiveRefreshToken,
    reused: rotation.reused
  };
}

/** Apply refreshed tokens as cookies, or clear auth cookies on failure. */
export async function refreshAuthSessionAndSetCookies(
  event: H3Event,
  options: { clearOnFailure?: boolean } = {}
): Promise<RefreshAuthSessionResult> {
  const clearOnFailure = options.clearOnFailure ?? true;
  const result = await refreshAuthSession(event);

  if (!result.ok) {
    if (clearOnFailure) {
      clearAuthCookies(event);
    }
    return result;
  }

  const config = getBasicAuthConfig();
  setAccessCookie(event, result.accessToken, config.accessTtlSeconds);
  setRefreshCookie(event, result.refreshToken, config.refreshTtlSeconds);
  return result;
}
