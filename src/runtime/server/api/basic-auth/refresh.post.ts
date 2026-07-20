import { defineEventHandler, getQuery, type H3Event } from 'h3';
import { createSessionExpiredError } from '../../lib/errors';
import { refreshAuthSessionAndSetCookies } from '../../lib/refresh-auth-session';
import { enforceBasicAuthRateLimit } from '../../lib/rate-limit';
import { enforceMutationOriginPolicy } from '../../lib/request-security';
import { assertBasicAuthReady, noStore } from './_helpers';

export async function handleRefresh(event: H3Event) {
  assertBasicAuthReady(event);
  noStore(event);
  enforceMutationOriginPolicy(event);
  enforceBasicAuthRateLimit(event, 'basic-auth:refresh');
  const query = getQuery(event);
  const silent = query.silent === '1' || query.silent === 'true';

  const result = await refreshAuthSessionAndSetCookies(event, { clearOnFailure: true });
  if (!result.ok) {
    if (silent) {
      return { ok: false as const };
    }
    throw createSessionExpiredError();
  }

  return { ok: true as const };
}

export default defineEventHandler(async (event) => {
  return await handleRefresh(event);
});
