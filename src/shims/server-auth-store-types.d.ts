declare module '~~/server/auth/store/types' {
  export type WorkspaceRole = 'owner' | 'editor' | 'viewer';

  export interface AuthWorkspaceStore {
    getUser?(input: {
      provider: string;
      providerUserId: string;
    }): Promise<{ userId: string; email?: string; displayName?: string } | null>;

    getOrCreateUser(input: {
      provider: string;
      providerUserId: string;
      email?: string;
      displayName?: string;
    }): Promise<{ userId: string }>;

    getOrCreateDefaultWorkspace(userId: string): Promise<{ workspaceId: string; workspaceName: string }>;
    getWorkspaceRole(input: { userId: string; workspaceId: string }): Promise<WorkspaceRole | null>;
    listUserWorkspaces(userId: string): Promise<Array<{ id: string; name: string; role: WorkspaceRole }>>;
    createWorkspace(input: { userId: string; name: string; description?: string | null }): Promise<{ workspaceId: string }>;
    updateWorkspace(input: { userId: string; workspaceId: string; name: string; description?: string | null }): Promise<void>;
    removeWorkspace(input: { userId: string; workspaceId: string }): Promise<void>;
    setActiveWorkspace(input: { userId: string; workspaceId: string }): Promise<void>;

    consumeInvite?(input: {
      workspaceId: string;
      email: string;
      tokenHash: string;
      acceptedUserId: string;
    }): Promise<
      | { ok: true; role: WorkspaceRole }
      | {
          ok: false;
          reason:
            | 'not_found'
            | 'expired'
            | 'revoked'
            | 'already_used'
            | 'token_mismatch';
        }
    >;
  }
}
