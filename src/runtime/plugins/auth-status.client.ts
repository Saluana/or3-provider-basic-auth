import { defineNuxtPlugin, useRuntimeConfig } from '#imports';
import { registerClientAuthStatusResolver } from '~/composables/auth/useClientAuthStatus.client';
import { registerClientSessionRecovery } from '~/composables/auth/useClientSessionRecovery';
import { silentRefreshOnce } from '../lib/silent-refresh.client';

type SessionPayload = {
  session?: {
    authenticated?: boolean;
    provider?: string | null;
  } | null;
};

async function fetchSession(): Promise<SessionPayload | null> {
  try {
    return await $fetch<SessionPayload>('/api/auth/session', {
      cache: 'no-store',
      // ofetch would resend a failed GET at once, even after a 429.
      retry: 0
    });
  } catch {
    return null;
  }
}

export default defineNuxtPlugin(() => {
  if (import.meta.server) return;
  const config = useRuntimeConfig();
  if (!config.public.ssrAuthEnabled) return;
  if (config.public.authProvider && config.public.authProvider !== 'basic-auth') return;

  registerClientSessionRecovery(async () => silentRefreshOnce());

  registerClientAuthStatusResolver(async () => {
    const first = await fetchSession();
    const firstSession = first?.session;

    if (
      firstSession?.authenticated === true &&
      firstSession.provider === 'basic-auth'
    ) {
      return { ready: true, authenticated: true };
    }

    // Session can briefly appear unauthenticated while access tokens are
    // rotating. Retry once via refresh endpoint before declaring logged out.
    const refreshed = await silentRefreshOnce();
    if (!refreshed) {
      return { ready: true, authenticated: false };
    }

    const second = await fetchSession();
    const secondSession = second?.session;
    const authenticated =
      secondSession?.authenticated === true &&
      secondSession.provider === 'basic-auth';

    return { ready: true, authenticated };
  });
});
