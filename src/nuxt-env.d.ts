declare global {
  const defineNuxtPlugin: typeof import('nuxt/app')['defineNuxtPlugin'];
  const defineNitroPlugin: (handler: (nitro: any) => void | Promise<void>) => void;
  const useRuntimeConfig: typeof import('nuxt/app')['useRuntimeConfig'];

  interface ImportMeta {
    readonly hot?: {
      readonly data: Record<string, any>;
      accept(): void;
      dispose(cb: (data: Record<string, any>) => void): void;
    };
  }
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, any>;
  export default component;
}

declare module '*.client.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, any>;
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
