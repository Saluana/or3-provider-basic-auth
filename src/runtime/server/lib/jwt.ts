import { randomUUID, createHash } from 'node:crypto';
import { getCookie } from 'h3';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../../lib/constants';
import { getBasicAuthConfig } from './config';

interface AccessClaimsInput {
  sub: string;
  sid: string;
  ver: number;
  email?: string;
  display_name?: string | null;
}

export interface BasicAccessTokenClaims extends JwtPayload {
  sub: string;
  sid: string;
  ver: number;
  typ: 'access';
  email?: string;
  display_name?: string | null;
}

interface RefreshClaimsInput {
  sub: string;
  sid: string;
  ver: number;
}

export interface BasicRefreshTokenClaims extends JwtPayload {
  sub: string;
  sid: string;
  ver: number;
  jti: string;
  typ: 'refresh';
}

export async function signAccessToken(input: AccessClaimsInput): Promise<string> {
  const config = getBasicAuthConfig();

  return jwt.sign(
    {
      sid: input.sid,
      ver: input.ver,
      typ: 'access',
      email: input.email,
      display_name: input.display_name ?? null
    },
    config.jwtSecret,
    {
      expiresIn: config.accessTtlSeconds,
      subject: input.sub
    }
  );
}

export async function signRefreshToken(input: RefreshClaimsInput): Promise<string> {
  const config = getBasicAuthConfig();

  return jwt.sign(
    {
      sid: input.sid,
      ver: input.ver,
      typ: 'refresh',
      jti: randomUUID()
    },
    config.refreshSecret,
    {
      expiresIn: config.refreshTtlSeconds,
      subject: input.sub
    }
  );
}

function isAccessClaims(payload: JwtPayload): payload is BasicAccessTokenClaims {
  return (
    payload.typ === 'access' &&
    typeof payload.sub === 'string' &&
    typeof payload.sid === 'string' &&
    typeof payload.ver === 'number'
  );
}

function isRefreshClaims(payload: JwtPayload): payload is BasicRefreshTokenClaims {
  return (
    payload.typ === 'refresh' &&
    typeof payload.sub === 'string' &&
    typeof payload.sid === 'string' &&
    typeof payload.ver === 'number' &&
    typeof payload.jti === 'string'
  );
}

export async function verifyAccessToken(token: string): Promise<BasicAccessTokenClaims | null> {
  try {
    const config = getBasicAuthConfig();
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    if (!isAccessClaims(payload)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<BasicRefreshTokenClaims | null> {
  try {
    const config = getBasicAuthConfig();
    const payload = jwt.verify(token, config.refreshSecret) as JwtPayload;
    if (!isRefreshClaims(payload)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getAccessTokenFromEvent(event: Parameters<typeof getCookie>[0]): string | null {
  return getCookie(event, ACCESS_COOKIE_NAME) ?? null;
}

export function getRefreshTokenFromEvent(event: Parameters<typeof getCookie>[0]): string | null {
  return getCookie(event, REFRESH_COOKIE_NAME) ?? null;
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
