declare global {
  const defineNuxtPlugin: typeof import('nuxt/app')['defineNuxtPlugin'];
  const defineNitroPlugin: (handler: (nitro: unknown) => void | Promise<void>) => void;
  const useRuntimeConfig: typeof import('nuxt/app')['useRuntimeConfig'];

  interface ImportMeta {
    readonly hot?: {
      readonly data: Record<string, unknown>;
      accept(): void;
      dispose(cb: (data: Record<string, unknown>) => void): void;
    };
  }
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<
    Record<string, unknown>,
    Record<string, unknown>,
    Record<string, unknown>
  >;
  export default component;
}

declare module '*.client.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<
    Record<string, unknown>,
    Record<string, unknown>,
    Record<string, unknown>
  >;
  export default component;
}

declare module 'nuxt/schema' {
  interface RuntimeConfig {
    auth: {
      enabled: boolean;
      provider: string;
      strict?: boolean;
      [key: string]: unknown;
    };
    security?: {
      proxy?: {
        trustProxy?: boolean;
        forwardedForHeader?: string;
        forwardedHostHeader?: string;
      };
    };
  }

  interface PublicRuntimeConfig {
    ssrAuthEnabled?: boolean;
    authProvider?: string;
    [key: string]: unknown;
  }
}

export {};
