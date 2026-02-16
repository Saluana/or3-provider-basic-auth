declare module '~~/server/admin/providers/types' {
  import type { H3Event } from 'h3';

  export type ProviderKind = 'auth' | 'sync' | 'storage';

  export type AdminWarning = {
    level: 'warning' | 'error';
    message: string;
  };

  export type ProviderAdminAction = {
    id: string;
    label: string;
    description?: string;
    danger?: boolean;
  };

  export type ProviderStatusContext = {
    enabled: boolean;
    provider: string;
  };

  export type ProviderAdminStatusResult = {
    details?: Record<string, unknown>;
    warnings: AdminWarning[];
    actions: ProviderAdminAction[];
  };

  export type ProviderActionContext = {
    provider: string;
    enabled: boolean;
    session: Record<string, unknown>;
  };

  export interface ProviderAdminAdapter {
    id: string;
    kind: ProviderKind;
    getStatus(event: H3Event, ctx: ProviderStatusContext): Promise<ProviderAdminStatusResult>;
    runAction?(
      event: H3Event,
      actionId: string,
      payload: Record<string, unknown> | undefined,
      ctx: ProviderActionContext
    ): Promise<unknown>;
  }
}
