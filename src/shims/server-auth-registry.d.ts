declare module '~~/server/auth/registry' {
  import type { AuthProviderRegistryItem } from '~~/server/auth/types';

  export function registerAuthProvider(input: AuthProviderRegistryItem): void;
}
