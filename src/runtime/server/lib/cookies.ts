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

function refreshCookieBase() {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: isProduction()
  };
}

export function setAccessCookie(event: H3Event, token: string, maxAgeSeconds: number): void {
  setCookie(event, ACCESS_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    path: ACCESS_COOKIE_PATH,
    maxAge: maxAgeSeconds
  });
}

export function setRefreshCookie(event: H3Event, token: string, maxAgeSeconds: number): void {
  // Drop legacy-path cookie so browsers don't keep a stale refresh token around.
  deleteCookie(event, REFRESH_COOKIE_NAME, {
    ...refreshCookieBase(),
    path: LEGACY_REFRESH_COOKIE_PATH
  });

  setCookie(event, REFRESH_COOKIE_NAME, token, {
    ...refreshCookieBase(),
    path: REFRESH_COOKIE_PATH,
    maxAge: maxAgeSeconds
  });
}

export function clearAuthCookies(event: H3Event): void {
  deleteCookie(event, ACCESS_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    path: ACCESS_COOKIE_PATH
  });

  deleteCookie(event, REFRESH_COOKIE_NAME, {
    ...refreshCookieBase(),
    path: REFRESH_COOKIE_PATH
  });

  deleteCookie(event, REFRESH_COOKIE_NAME, {
    ...refreshCookieBase(),
    path: LEGACY_REFRESH_COOKIE_PATH
  });
}
