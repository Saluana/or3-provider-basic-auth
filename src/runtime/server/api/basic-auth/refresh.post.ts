import { randomUUID } from 'node:crypto';
import { defineEventHandler, getQuery, type H3Event } from 'h3';
import { clearAuthCookies, setAccessCookie, setRefreshCookie } from '../../lib/cookies';
import { getBasicAuthConfig } from '../../lib/config';
import { createSessionExpiredError } from '../../lib/errors';
import {
  getRefreshTokenFromEvent,
  hashRefreshToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from '../../lib/jwt';
import { enforceBasicAuthRateLimit } from '../../lib/rate-limit';
import {
  findAccountById,
  rotateSession,
  getSessionMetadataFromEvent
} from '../../lib/session-store';
import { enforceMutationOriginPolicy } from '../../lib/request-security';
import { assertBasicAuthReady, noStore } from './_helpers';

export async function handleRefresh(event: H3Event) {
  assertBasicAuthReady(event);
  noStore(event);
  enforceMutationOriginPolicy(event);
  enforceBasicAuthRateLimit(event, 'basic-auth:refresh');
  const query = getQuery(event);
  const silent = query.silent === '1' || query.silent === 'true';

  const failExpired = () => {
    clearAuthCookies(event);
    if (silent) {
      return { ok: false as const };
    }
    throw createSessionExpiredError();
  };

  const refreshToken = getRefreshTokenFromEvent(event);
  if (!refreshToken) {
    return failExpired();
  }

  const claims = await verifyRefreshToken(refreshToken);
  if (!claims) {
    return failExpired();
  }

  const account = findAccountById(claims.sub);
  if (!account || account.token_version !== claims.ver) {
    return failExpired();
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
    newExpiresAtMs: Date.now() + config.refreshTtlSeconds * 1000,
    metadata: getSessionMetadataFromEvent(event)
  });

  if (!rotation.ok || rotation.accountId !== account.id) {
    return failExpired();
  }

  const accessToken = await signAccessToken({
    sub: account.id,
    sid: newSessionId,
    ver: account.token_version,
    email: account.email,
    display_name: account.display_name
  });

  setAccessCookie(event, accessToken, config.accessTtlSeconds);
  setRefreshCookie(event, newRefreshToken, config.refreshTtlSeconds);

  return { ok: true };
}

export default defineEventHandler(async (event) => {
  return await handleRefresh(event);
});
