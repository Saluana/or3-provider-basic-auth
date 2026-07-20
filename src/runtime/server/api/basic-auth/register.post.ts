import { randomUUID } from 'node:crypto';
import { createError, defineEventHandler, setCookie, type H3Event } from 'h3';
import { z } from 'zod';
import { getAuthWorkspaceStore } from '~~/server/auth/store/registry';
import {
  resolveRegistrationMode,
  validateInviteRegistration,
  type RegistrationDecision
} from '~~/server/auth/registration';
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
  createAccountAndSession,
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

function mapRegistrationErrorToHttp(
  reason: Extract<RegistrationDecision, { allowed: false }>['reason']
): never {
  if (reason === 'disabled') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Registration is currently disabled. Please contact an administrator.'
    });
  }
  if (reason === 'invite_secret_missing' || reason === 'invite_unsupported') {
    throw createError({
      statusCode: 503,
      statusMessage: 'Invite-only registration is temporarily unavailable.'
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

  const runtimeConfig = useRuntimeConfig();
  const mode = resolveRegistrationMode(runtimeConfig);

  if (mode === 'disabled') {
    mapRegistrationErrorToHttp('disabled');
  }

  if (mode === 'invite_only' && !body.inviteToken?.trim()) {
    mapRegistrationErrorToHttp('invite_required');
  }

  if (mode === 'invite_only') {
    const syncConfig = runtimeConfig as {
      sync?: { provider?: string };
      public?: { sync?: { provider?: string } };
    };
    const storeId =
      syncConfig.sync?.provider ??
      syncConfig.public?.sync?.provider ??
      'convex';
    const store = getAuthWorkspaceStore(storeId);
    if (!store) {
      mapRegistrationErrorToHttp('invite_unsupported');
    }
    const decision = await validateInviteRegistration({
      event,
      store,
      mode,
      email,
      inviteToken: body.inviteToken
    });
    if (!decision.allowed) {
      mapRegistrationErrorToHttp(decision.reason);
    }
  }

  const existing = findAccountByEmail(email);
  if (existing) {
    throw createInvalidCredentialsError();
  }

  const passwordHash = await hashPassword(body.password);

  const config = getBasicAuthConfig();
  if (config.refreshTtlSeconds <= 0 || config.accessTtlSeconds <= 0) {
    throw createInvalidRequestError();
  }

  const accountId = randomUUID();
  const sessionId = randomUUID();
  const refreshToken = await signRefreshToken({
    sub: accountId,
    sid: sessionId,
    ver: 0
  });

  const accessToken = await signAccessToken({
    sub: accountId,
    sid: sessionId,
    ver: 0,
    email,
    display_name: body.displayName?.trim() || null
  });

  createAccountAndSession({
    account: {
      id: accountId,
      email,
      passwordHash,
      displayName: body.displayName?.trim() || null
    },
    session: {
      accountId,
      sessionId,
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAtMs: Date.now() + config.refreshTtlSeconds * 1000,
      metadata: getSessionMetadataFromEvent(event)
    }
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
