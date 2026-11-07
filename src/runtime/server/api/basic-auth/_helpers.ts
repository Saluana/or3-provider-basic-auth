import { useRuntimeConfig } from '#imports';
import { createError, getHeader, readBody, setResponseHeader, type H3Event } from 'h3';
import type { z } from 'zod';
import { validateBasicAuthConfig } from '../../lib/config';
import { createAuthNotConfiguredError, createInvalidRequestError } from '../../lib/errors';

// Credentials and invitation tokens are control messages, never file uploads.
const AUTH_BODY_LIMIT_BYTES = 16 * 1024;

function payloadTooLarge(event: H3Event) {
  // Finish the 413 response before closing an unfinished upload. Destroying the
  // request immediately would reset the socket and hide the response.
  event.node.res.shouldKeepAlive = false;
  event.node.req.pause();
  return createError({ statusCode: 413, statusMessage: 'The request body is too large.' });
}

async function readLimitedBody(event: H3Event): Promise<unknown> {
  const declared = getHeader(event, 'content-length');
  if (declared !== undefined) {
    const length = Number(declared);
    if (!Number.isSafeInteger(length) || length < 0 || length > AUTH_BODY_LIMIT_BYTES) {
      throw payloadTooLarge(event);
    }
  }

  const chunks: Buffer[] = [];
  let length = 0;
  try {
    // Basic Auth's SQLite runtime is Node-only. Keep the socket available for
    // an HTTP error response when we stop consuming an oversized request.
    const stream = event.node.req.iterator({ destroyOnReturn: false }) as AsyncIterable<Uint8Array | string>;
    for await (const chunk of stream) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      length += bytes.byteLength;
      if (length > AUTH_BODY_LIMIT_BYTES) throw payloadTooLarge(event);
      chunks.push(bytes);
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 413) throw error;
    throw createInvalidRequestError();
  }

  // Give h3 only the bounded bytes, retaining its JSON and form parsing rules
  // (including duplicate form fields) instead of maintaining another decoder.
  event._requestBody = new Uint8Array(Buffer.concat(chunks, length));
  return readBody(event);
}

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
  const body = await readLimitedBody(event);
  const result = schema.safeParse(body);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue?.path?.join('.') || 'input';
    const detail = firstIssue?.message || 'Invalid request';
    if (detail === 'Password is too long. Please shorten it.') {
      throw createError({ statusCode: 400, statusMessage: detail });
    }
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
