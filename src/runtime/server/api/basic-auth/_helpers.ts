import { createError, readBody, setResponseHeader, type H3Event } from 'h3';
import type { z } from 'zod';
import { validateBasicAuthConfig } from '../../lib/config';
import { createAuthNotConfiguredError, createInvalidRequestError } from '../../lib/errors';

export function assertBasicAuthReady(event: H3Event): void {
  const diagnostics = validateBasicAuthConfig(useRuntimeConfig(event));

  if (!diagnostics.config.enabled || diagnostics.config.providerId !== 'basic-auth') {
    throw createAuthNotConfiguredError();
  }

  if (!diagnostics.isValid) {
    throw createAuthNotConfiguredError();
  }
}

export async function parseBodyWithSchema<T extends z.ZodTypeAny>(
  event: H3Event,
  schema: T
): Promise<z.infer<T>> {
  const body = await readBody(event);
  const result = schema.safeParse(body);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue?.path?.join('.') || 'input';
    const detail = firstIssue?.message || 'Invalid request';
    // Prefer actionable messages for common auth fields without dumping full Zod trees.
    if (path === 'password' || path === 'confirmPassword') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Password must be at least 8 characters.',
      });
    }
    if (detail === 'Passwords must match') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Passwords must match.',
      });
    }
    if (path === 'email') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Enter a valid email address.',
      });
    }
    throw createInvalidRequestError();
  }

  return result.data;
}

export function noStore(event: H3Event): void {
  setResponseHeader(event, 'Cache-Control', 'no-store');
}

export function createForbiddenError(): ReturnType<typeof createError> {
  return createError({ statusCode: 403, statusMessage: 'Forbidden' });
}
