import { randomUUID } from 'node:crypto';
import { defineEventHandler, type H3Event } from 'h3';
import { z } from 'zod';
import { clearAuthCookies, setAccessCookie, setRefreshCookie } from '../../lib/cookies';
import { getBasicAuthConfig } from '../../lib/config';
import {
  createInvalidCredentialsError,
  createInvalidRequestError
} from '../../lib/errors';
import { signAccessToken, signRefreshToken, hashRefreshToken } from '../../lib/jwt';
import { verifyPassword } from '../../lib/password';
import { enforceBasicAuthRateLimit } from '../../lib/rate-limit';
import {
  createAuthSession,
  findAccountByEmail,
  normalizeEmail,
  getSessionMetadataFromEvent
} from '../../lib/session-store';
import { enforceMutationOriginPolicy } from '../../lib/request-security';
import { assertBasicAuthReady, noStore, parseBodyWithSchema } from './_helpers';

const signInSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(512)
});

const DUMMY_PASSWORD_HASH =
  '$2a$12$1XCXpgmbzURDdc0AGJiAsemtT39PAw8WwV7fBOq6A5VQv6.qN6Va.';

export async function handleSignIn(event: H3Event) {
  assertBasicAuthReady(event);
  noStore(event);
  enforceMutationOriginPolicy(event);
  enforceBasicAuthRateLimit(event, 'basic-auth:sign-in');

  const input = await parseBodyWithSchema(event, signInSchema);
  const email = normalizeEmail(input.email);
  const account = findAccountByEmail(email);

  if (!account) {
    await verifyPassword(input.password, DUMMY_PASSWORD_HASH);
    clearAuthCookies(event);
    throw createInvalidCredentialsError();
  }

  const isPasswordValid = await verifyPassword(input.password, account.password_hash);
  if (!isPasswordValid) {
    clearAuthCookies(event);
    throw createInvalidCredentialsError();
  }

  const config = getBasicAuthConfig();
  if (config.refreshTtlSeconds <= 0 || config.accessTtlSeconds <= 0) {
    throw createInvalidRequestError();
  }

  const sessionId = randomUUID();
  const refreshToken = await signRefreshToken({
    sub: account.id,
    sid: sessionId,
    ver: account.token_version
  });

  createAuthSession({
    accountId: account.id,
    sessionId,
    refreshTokenHash: hashRefreshToken(refreshToken),
    expiresAtMs: Date.now() + config.refreshTtlSeconds * 1000,
    metadata: getSessionMetadataFromEvent(event)
  });

  const accessToken = await signAccessToken({
    sub: account.id,
    sid: sessionId,
    ver: account.token_version,
    email: account.email,
    display_name: account.display_name
  });

  setAccessCookie(event, accessToken, config.accessTtlSeconds);
  setRefreshCookie(event, refreshToken, config.refreshTtlSeconds);

  return { ok: true };
}

export default defineEventHandler(async (event) => {
  return await handleSignIn(event);
});
