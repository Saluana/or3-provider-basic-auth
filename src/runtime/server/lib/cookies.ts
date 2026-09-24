import { setCookie, deleteCookie, type H3Event } from 'h3';
import {
  ACCESS_COOKIE_NAME,
  ACCESS_COOKIE_PATH,
  LEGACY_REFRESH_COOKIE_PATH,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH
} from '../../lib/constants';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function accessCookieName(): string {
  const scope = process.env.OR3_PLUGIN_DEV_COOKIE_SCOPE;
  return scope ? `${ACCESS_COOKIE_NAME}_${scope}` : ACCESS_COOKIE_NAME;
}

export function refreshCookieName(): string {
  const scope = process.env.OR3_PLUGIN_DEV_COOKIE_SCOPE;
  return scope ? `${REFRESH_COOKIE_NAME}_${scope}` : REFRESH_COOKIE_NAME;
}

function refreshCookieBase() {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: isProduction()
  };
}

export function setAccessCookie(event: H3Event, token: string, maxAgeSeconds: number): void {
  setCookie(event, accessCookieName(), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    path: ACCESS_COOKIE_PATH,
    maxAge: maxAgeSeconds
  });
}

export function setRefreshCookie(event: H3Event, token: string, maxAgeSeconds: number): void {
  // Drop legacy-path cookie so browsers don't keep a stale refresh token around.
  deleteCookie(event, refreshCookieName(), {
    ...refreshCookieBase(),
    path: LEGACY_REFRESH_COOKIE_PATH
  });

  setCookie(event, refreshCookieName(), token, {
    ...refreshCookieBase(),
    path: REFRESH_COOKIE_PATH,
    maxAge: maxAgeSeconds
  });
}

export function clearAuthCookies(event: H3Event): void {
  deleteCookie(event, accessCookieName(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    path: ACCESS_COOKIE_PATH
  });

  deleteCookie(event, refreshCookieName(), {
    ...refreshCookieBase(),
    path: REFRESH_COOKIE_PATH
  });

  deleteCookie(event, refreshCookieName(), {
    ...refreshCookieBase(),
    path: LEGACY_REFRESH_COOKIE_PATH
  });
}
