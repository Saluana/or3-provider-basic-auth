import { setCookie, deleteCookie, type H3Event } from 'h3';
import {
  ACCESS_COOKIE_NAME,
  ACCESS_COOKIE_PATH,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH
} from '../../lib/constants';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
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
  setCookie(event, REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
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
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    path: REFRESH_COOKIE_PATH
  });
}
