type RuntimeConfigGetter = (...args: unknown[]) => unknown;

export function defineNuxtPlugin<T>(plugin: T): T {
  return plugin;
}

export function useRuntimeConfig(...args: unknown[]): unknown {
  const getter = (globalThis as typeof globalThis & {
    useRuntimeConfig?: RuntimeConfigGetter;
  }).useRuntimeConfig;
  return getter ? getter(...args) : {};
}

export function useNuxtApp(): Record<string, unknown> {
  return {};
}

export async function useFetch<T>(): Promise<{ data: { value: T | null } }> {
  return { data: { value: null } };
}

export function useState<T>(_key: string, init?: () => T) {
  return { value: init?.() };
}
