import { createError } from 'h3';

export function createInvalidCredentialsError() {
  return createError({
    statusCode: 401,
    statusMessage: 'Invalid credentials'
  });
}

export function createSessionExpiredError() {
  return createError({
    statusCode: 401,
    statusMessage: 'Session expired'
  });
}

export function createInvalidRequestError() {
  return createError({
    statusCode: 400,
    statusMessage: 'Invalid request'
  });
}

export function createAuthNotConfiguredError() {
  return createError({
    statusCode: 503,
    statusMessage: 'Authentication provider is not configured'
  });
}
