declare module '~~/server/auth/store/registry' {
  import type { AuthWorkspaceStore } from '~~/server/auth/store/types';
  export function getAuthWorkspaceStore(id: string): AuthWorkspaceStore | null;
}
