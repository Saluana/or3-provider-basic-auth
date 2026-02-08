declare module '~/composables/auth/useSessionContext' {
  import type { ComputedRef, Ref } from 'vue';

  interface SessionInfo {
    authenticated?: boolean;
    provider?: string;
    user?: {
      id?: string;
      email?: string;
      displayName?: string;
    };
    [key: string]: unknown;
  }

  interface SessionPayload {
    session: SessionInfo | null;
  }

  export function useSessionContext(): {
    data: ComputedRef<SessionPayload | null>;
    pending: Ref<boolean>;
    error: Ref<Error | null>;
    refresh: () => Promise<void>;
  };
}

declare module '#app' {
  import type { Component } from 'vue';

  interface NuxtApp {
    $registerAuthUiAdapter?: (input: {
      id: string;
      component: Component;
    }) => void;
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $registerAuthUiAdapter?: (input: {
      id: string;
      component: Component;
    }) => void;
  }
}
