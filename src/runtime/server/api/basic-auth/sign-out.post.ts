import { defineEventHandler, type H3Event } from 'h3';
import { revokeHostActivationsForUser } from '~~/server/utils/plugins/isolation/activation-registry';
import { clearAuthCookies } from '../../lib/cookies';
import {
  getAccessTokenFromEvent,
  getRefreshTokenFromEvent,
  verifyAccessToken,
  verifyRefreshToken
} from '../../lib/jwt';
import { enforceBasicAuthRateLimit } from '../../lib/rate-limit';
import {
  findAccountById,
  findUsableSessionInChain,
  revokeSessionChain
} from '../../lib/session-store';
import { enforceMutationOriginPolicy } from '../../lib/request-security';
import { assertBasicAuthReady, noStore } from './_helpers';

/**
 * Resolve the signing-out user from the presented tokens without refreshing:
 * a refresh here would rotate the session into a successor that the logout
 * below must then chase. A usable session is required, optionally reached
 * through rotation successors so a stale rotated cookie still logs the user out.
 */
async function resolveSignOutUserId(event: H3Event): Promise<string | null> {
  const accessToken = getAccessTokenFromEvent(event);
  if (accessToken) {
    const claims = await verifyAccessToken(accessToken);
    if (claims && findUsableSessionInChain(claims.sid)) {
      const account = findAccountById(claims.sub);
      if (account && account.token_version === claims.ver) {
        return account.id;
      }
    }
  }

  const refreshToken = getRefreshTokenFromEvent(event);
  if (refreshToken) {
    const claims = await verifyRefreshToken(refreshToken);
    if (claims && findUsableSessionInChain(claims.sid)) {
      const account = findAccountById(claims.sub);
      if (account && account.token_version === claims.ver) {
        return account.id;
      }
    }
  }

  return null;
}

export async function handleSignOut(event: H3Event) {
  assertBasicAuthReady(event);
  noStore(event);
  enforceMutationOriginPolicy(event);
  enforceBasicAuthRateLimit(event, 'basic-auth:sign-out');

  // Authoritative logout teardown while the session is still valid. After the
  // cookies below are cleared the client can no longer authenticate a teardown
  // request, so handles revoked here never linger past logout.
  try {
    const userId = await resolveSignOutUserId(event);
    if (userId) {
      revokeHostActivationsForUser(userId, 'logout');
    }
  } catch {
    // No resolvable session: nothing to revoke.
  }

  const refreshToken = getRefreshTokenFromEvent(event);
  if (refreshToken) {
    const refreshClaims = await verifyRefreshToken(refreshToken);
    if (refreshClaims) {
      // Revoke successors too: a rotation grace window could otherwise recover
      // the successor session from the replayed predecessor token.
      revokeSessionChain(refreshClaims.sid);
    }
  }

  const accessToken = getAccessTokenFromEvent(event);
  if (accessToken) {
    const accessClaims = await verifyAccessToken(accessToken);
    if (accessClaims) {
      revokeSessionChain(accessClaims.sid);
    }
  }

  clearAuthCookies(event);
  return { ok: true };
}

export default defineEventHandler(async (event) => {
  return await handleSignOut(event);
});
