import { computed, ref } from 'vue';

type TestSession = { session: Record<string, unknown> | null } | null;

const state = ref<TestSession>(null);
let refreshImpl: () => Promise<void> = async () => undefined;

/** Sets the shared session the component under test will read. */
export function setTestSession(payload: TestSession): void {
  state.value = payload;
}

/** Replaces what `refresh()` does, e.g. to flip the session after an auth event. */
export function setTestRefresh(impl: () => Promise<void>): void {
  refreshImpl = impl;
}

export function resetTestSession(): void {
  state.value = null;
  refreshImpl = async () => undefined;
}

export function useSessionContext() {
  return {
    data: computed(() => state.value),
    pending: ref(false),
    error: ref<Error | null>(null),
    refresh: () => refreshImpl(),
  };
}
