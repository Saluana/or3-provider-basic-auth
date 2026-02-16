declare module '~~/server/admin/providers/registry' {
  import type { ProviderAdminAdapter } from '~~/server/admin/providers/types';

  export function registerProviderAdminAdapter(adapter: ProviderAdminAdapter): void;
}
