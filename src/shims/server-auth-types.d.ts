declare module '~~/server/auth/types' {
  import type { H3Event } from 'h3';

  export interface ProviderUser {
    id: string;
    email?: string;
    displayName?: string;
  }

  export interface ProviderSession {
    provider: string;
    user: ProviderUser;
    expiresAt: Date;
    claims?: Record<string, unknown>;
  }

  export interface AuthProvider {
    name: string;
    getSession(event: H3Event): Promise<ProviderSession | null>;
  }

  export interface AuthProviderRegistryItem {
    id: string;
    order?: number;
    create: () => AuthProvider;
  }
}
