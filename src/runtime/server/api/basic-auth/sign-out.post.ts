import { defineEventHandler, type H3Event } from 'h3';
import { clearAuthCookies } from '../../lib/cookies';
import {
  getAccessTokenFromEvent,
  getRefreshTokenFromEvent,
  verifyAccessToken,
  verifyRefreshToken
} from '../../lib/jwt';
import { enforceBasicAuthRateLimit } from '../../lib/rate-limit';
import { revokeSessionById } from '../../lib/session-store';
import { enforceMutationOriginPolicy } from '../../lib/request-security';
import { assertBasicAuthReady, noStore } from './_helpers';

export async function handleSignOut(event: H3Event) {
  assertBasicAuthReady(event);
  noStore(event);
  enforceMutationOriginPolicy(event);
  enforceBasicAuthRateLimit(event, 'basic-auth:sign-out');

  const refreshToken = getRefreshTokenFromEvent(event);
  if (refreshToken) {
    const refreshClaims = await verifyRefreshToken(refreshToken);
    if (refreshClaims) {
      revokeSessionById(refreshClaims.sid);
    }
  }

  const accessToken = getAccessTokenFromEvent(event);
  if (accessToken) {
    const accessClaims = await verifyAccessToken(accessToken);
    if (accessClaims) {
      revokeSessionById(accessClaims.sid);
    }
  }

  clearAuthCookies(event);
  return { ok: true };
}

export default defineEventHandler(async (event) => {
  return await handleSignOut(event);
});
