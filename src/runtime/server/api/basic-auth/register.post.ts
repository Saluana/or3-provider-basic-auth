import { randomUUID } from 'node:crypto';
import { createError, defineEventHandler, setCookie, type H3Event } from 'h3';
import { z } from 'zod';
import { clearAuthCookies, setAccessCookie, setRefreshCookie } from '../../lib/cookies';
import { getBasicAuthConfig } from '../../lib/config';
import {
  createInvalidRequestError,
  createInvalidCredentialsError
} from '../../lib/errors';
import { signAccessToken, signRefreshToken, hashRefreshToken } from '../../lib/jwt';
import { hashPassword } from '../../lib/password';
import { enforceBasicAuthRateLimit } from '../../lib/rate-limit';
import {
  createAccount,
  createAuthSession,
  findAccountByEmail,
  normalizeEmail,
  getSessionMetadataFromEvent
} from '../../lib/session-store';
import { enforceMutationOriginPolicy } from '../../lib/request-security';
import { assertBasicAuthReady, noStore, parseBodyWithSchema } from './_helpers';

const registerSchema = z
  .object({
    email: z.string().email().max(320),
    password: z.string().min(8).max(512),
    confirmPassword: z.string().min(8).max(512),
    displayName: z.string().trim().min(1).max(120).optional(),
    inviteToken: z.string().trim().min(1).max(4096).optional()
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords must match'
  });

function mapRegistrationErrorToHttp(reason: 'disabled' | 'invite_required'): never {
  if (reason === 'disabled') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Registration is currently disabled. Please contact an administrator.'
    });
  }
  throw createError({
    statusCode: 403,
    statusMessage: 'A valid invite is required to register.'
  });
}

export async function handleRegister(event: H3Event) {
  assertBasicAuthReady(event);
  noStore(event);
  enforceMutationOriginPolicy(event);
  enforceBasicAuthRateLimit(event, 'basic-auth:register');

  const body = await parseBodyWithSchema(event, registerSchema);
  const email = normalizeEmail(body.email);

  const existing = findAccountByEmail(email);
  if (existing) {
    throw createInvalidCredentialsError();
  }

  const runtimeConfig = useRuntimeConfig();
  const mode =
    runtimeConfig.auth?.registrationMode ??
    (runtimeConfig.auth?.autoProvision === false ? 'disabled' : 'open');

  if (mode === 'disabled') {
    mapRegistrationErrorToHttp('disabled');
  }

  if (mode === 'invite_only' && !body.inviteToken?.trim()) {
    mapRegistrationErrorToHttp('invite_required');
  }

  const passwordHash = await hashPassword(body.password);
  const account = createAccount({
    email,
    passwordHash,
    displayName: body.displayName?.trim() || null
  });

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

  if (mode === 'invite_only' && body.inviteToken?.trim()) {
    setCookie(event, 'or3_invite_token', body.inviteToken.trim(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 10 * 60,
    });
  }

  return { ok: true };
}

export default defineEventHandler(async (event) => {
  try {
    return await handleRegister(event);
  } catch (error) {
    clearAuthCookies(event);
    throw error;
  }
});
