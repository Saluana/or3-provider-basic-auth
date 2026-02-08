import type { H3Event } from 'h3';
import type { AuthProvider } from '~~/server/auth/types';
import { BASIC_AUTH_PROVIDER_ID } from '../../lib/constants';
import { getAccessTokenFromEvent, verifyAccessToken } from '../lib/jwt';
import {
  findAccountById,
  findSessionById,
  isSessionUsable
} from '../lib/session-store';

export const basicAuthProvider: AuthProvider = {
  name: BASIC_AUTH_PROVIDER_ID,

  async getSession(event: H3Event) {
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

    return {
      provider: BASIC_AUTH_PROVIDER_ID,
      user: {
        id: payload.sub,
        email: payload.email ?? account.email,
        displayName: payload.display_name ?? account.display_name ?? undefined
      },
      expiresAt: new Date((payload.exp ?? 0) * 1000),
      claims: payload as Record<string, unknown>
    };
  }
};
