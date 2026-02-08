import { defineEventHandler, type H3Event } from 'h3';
import { z } from 'zod';
import { clearAuthCookies } from '../../lib/cookies';
import { createInvalidCredentialsError, createSessionExpiredError } from '../../lib/errors';
import { hashPassword, verifyPassword } from '../../lib/password';
import { enforceBasicAuthRateLimit } from '../../lib/rate-limit';
import {
  findAccountById,
  updatePasswordAndRevokeSessions
} from '../../lib/session-store';
import { enforceMutationOriginPolicy } from '../../lib/request-security';
import { basicAuthProvider } from '../../auth/basic-auth-provider';
import { assertBasicAuthReady, noStore, parseBodyWithSchema } from './_helpers';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8).max(512),
    newPassword: z.string().min(8).max(512),
    confirmNewPassword: z.string().min(8).max(512)
  })
  .refine((input) => input.newPassword === input.confirmNewPassword, {
    message: 'Passwords must match'
  });

export async function handleChangePassword(event: H3Event) {
  assertBasicAuthReady(event);
  noStore(event);
  enforceMutationOriginPolicy(event);
  enforceBasicAuthRateLimit(event, 'basic-auth:change-password');

  const session = await basicAuthProvider.getSession(event);
  if (!session) {
    clearAuthCookies(event);
    throw createSessionExpiredError();
  }

  const body = await parseBodyWithSchema(event, changePasswordSchema);
  const account = findAccountById(session.user.id);

  if (!account) {
    clearAuthCookies(event);
    throw createSessionExpiredError();
  }

  const validCurrentPassword = await verifyPassword(body.currentPassword, account.password_hash);
  if (!validCurrentPassword) {
    throw createInvalidCredentialsError();
  }

  const newPasswordHash = await hashPassword(body.newPassword);
  updatePasswordAndRevokeSessions(account.id, newPasswordHash);

  clearAuthCookies(event);
  return { ok: true };
}

export default defineEventHandler(async (event) => {
  return await handleChangePassword(event);
});
