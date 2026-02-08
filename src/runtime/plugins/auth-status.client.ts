import { registerClientAuthStatusResolver } from '~/composables/auth/useClientAuthStatus.client';

type SessionPayload = {
  session?: {
    authenticated?: boolean;
    provider?: string | null;
  } | null;
};

async function fetchSession(): Promise<SessionPayload | null> {
  try {
    return await $fetch<SessionPayload>('/api/auth/session', {
      cache: 'no-store'
    });
  } catch {
    return null;
  }
}

async function trySilentRefresh(): Promise<boolean> {
  try {
    const res = await $fetch<{ ok?: boolean }>('/api/basic-auth/refresh?silent=1', {
      method: 'POST'
    });
    return res?.ok === true;
  } catch {
    return false;
  }
}

export default defineNuxtPlugin(() => {
  if (import.meta.server) return;

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
    const refreshed = await trySilentRefresh();
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
