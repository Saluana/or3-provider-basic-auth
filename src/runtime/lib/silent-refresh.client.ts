/**
 * Process-wide single-flight for silent refresh.
 *
 * HMR remounts and auth-status checks can otherwise POST /refresh concurrently,
 * which races token rotation. All callers share one in-flight promise.
 */

const GLOBAL_KEY = '__or3_basic_auth_silent_refresh__';

type SilentRefreshRegistry = {
  inflight: Promise<boolean> | null;
};

function getRegistry(): SilentRefreshRegistry {
  const globalAny = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: SilentRefreshRegistry;
  };
  if (!globalAny[GLOBAL_KEY]) {
    globalAny[GLOBAL_KEY] = { inflight: null };
  }
  return globalAny[GLOBAL_KEY]!;
}

async function postSilentRefresh(): Promise<boolean> {
  try {
    const response = await $fetch<{ ok?: boolean }>('/api/basic-auth/refresh?silent=1', {
      method: 'POST'
    });
    return response?.ok === true;
  } catch {
    return false;
  }
}

/** Deduplicated silent refresh — safe to call from many HMR remount paths. */
export function silentRefreshOnce(): Promise<boolean> {
  const registry = getRegistry();
  if (registry.inflight) {
    return registry.inflight;
  }

  registry.inflight = postSilentRefresh().finally(() => {
    registry.inflight = null;
  });

  return registry.inflight;
}

/** Test helper — clears the shared in-flight promise. */
export function resetSilentRefreshForTests(): void {
  getRegistry().inflight = null;
}
