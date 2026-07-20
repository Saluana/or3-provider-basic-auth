import type { H3Event } from 'h3';
import type { AuthProvider } from '~~/server/auth/types';
import { BASIC_AUTH_PROVIDER_ID } from '../../lib/constants';
import {
  getAccessTokenFromEvent,
  getRefreshTokenFromEvent,
  verifyAccessToken
} from '../lib/jwt';
import { refreshAuthSessionAndSetCookies } from '../lib/refresh-auth-session';
import {
  findAccountById,
  findSessionById,
  isSessionUsable
} from '../lib/session-store';
import type { BasicAuthAccount } from '../db/schema';
import type { BasicAccessTokenClaims } from '../lib/jwt';

function toProviderSession(
  account: BasicAuthAccount,
  payload: Pick<BasicAccessTokenClaims, 'sub' | 'email' | 'display_name' | 'exp'> &
    Record<string, unknown>
) {
  return {
    provider: BASIC_AUTH_PROVIDER_ID,
    user: {
      id: payload.sub,
      email: payload.email ?? account.email,
      displayName: payload.display_name ?? account.display_name ?? undefined
    },
    expiresAt: new Date((payload.exp ?? 0) * 1000),
    claims: payload
  };
}

async function resolveFromAccessToken(event: H3Event) {
  const accessToken = getAccessTokenFromEvent(event);
  if (!accessToken) {
    return null;
  }

  const payload = await verifyAccessToken(accessToken);
  if (!payload) {
    return null;
  }

  const session = findSessionById(payload.sid);
  if (!isSessionUsable(session)) {
    return null;
  }

  const account = findAccountById(payload.sub);
  if (!account) {
    return null;
  }

  if (account.token_version !== payload.ver) {
    return null;
  }

  return toProviderSession(account, payload);
}

export const basicAuthProvider: AuthProvider = {
  name: BASIC_AUTH_PROVIDER_ID,

  async getSession(event: H3Event) {
    const fromAccess = await resolveFromAccessToken(event);
    if (fromAccess) {
      return fromAccess;
    }

    // Access missing/expired — recover via refresh cookie when present.
    // Refresh cookie path is `/api`, so `/api/auth/session` receives it.
    if (!getRefreshTokenFromEvent(event)) {
      return null;
    }

    const refreshed = await refreshAuthSessionAndSetCookies(event, {
      // Do not clear cookies on transient refresh misses during migration
      // (legacy path cookies may still only be sent to /api/basic-auth/*).
      clearOnFailure: false
    });

    if (!refreshed.ok) {
      return null;
    }

    const accessPayload = await verifyAccessToken(refreshed.accessToken);
    if (!accessPayload) {
      return null;
    }

    return toProviderSession(refreshed.account, accessPayload);
  }
};
