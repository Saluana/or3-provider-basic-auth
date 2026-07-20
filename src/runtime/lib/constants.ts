export const BASIC_AUTH_PROVIDER_ID = 'basic-auth';

export const ACCESS_COOKIE_NAME = 'or3_access';
export const REFRESH_COOKIE_NAME = 'or3_refresh';

export const DEFAULT_ACCESS_TTL_SECONDS = 900;
export const DEFAULT_REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;

export const ACCESS_COOKIE_PATH = '/';
/**
 * Refresh cookies are scoped to `/api` so session resolution (`/api/auth/session`)
 * can transparently rotate expired access tokens. Previously `/api/basic-auth`
 * prevented that recovery path.
 */
export const REFRESH_COOKIE_PATH = '/api';
/** Legacy path from earlier builds; cleared on set/clear for migration. */
export const LEGACY_REFRESH_COOKIE_PATH = '/api/basic-auth';

/**
 * Concurrent refresh requests within this window reuse the successor tokens
 * instead of being treated as replay attacks (common under HMR remounts).
 */
export const REFRESH_ROTATION_GRACE_MS = 30_000;
