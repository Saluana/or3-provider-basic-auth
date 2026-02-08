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
