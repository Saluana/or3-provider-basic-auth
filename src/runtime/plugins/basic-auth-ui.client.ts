import type { Component } from 'vue';
import { BASIC_AUTH_PROVIDER_ID } from '../lib/constants';

type AuthUiRegistryInput = {
  id: string;
  component: Component;
};
type AuthUiRegistryBridge = {
  $registerAuthUiAdapter?: (input: AuthUiRegistryInput) => void;
};
type AuthUiRegistryGlobalState = typeof globalThis & {
  __or3AuthUiAdapterQueue__?: AuthUiRegistryInput[];
};

function tryRegisterAuthUiAdapter(component: Component): boolean {
  const nuxtApp = useNuxtApp() as AuthUiRegistryBridge;
  if (typeof nuxtApp.$registerAuthUiAdapter !== 'function') {
    return false;
  }
  nuxtApp.$registerAuthUiAdapter({
    id: BASIC_AUTH_PROVIDER_ID,
    component
  });
  return true;
}

function enqueueAuthUiAdapter(component: Component): void {
  const payload: AuthUiRegistryInput = {
    id: BASIC_AUTH_PROVIDER_ID,
    component
  };
  const globalState = globalThis as AuthUiRegistryGlobalState;
  if (!Array.isArray(globalState.__or3AuthUiAdapterQueue__)) {
    globalState.__or3AuthUiAdapterQueue__ = [];
  }
  globalState.__or3AuthUiAdapterQueue__.push(payload);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<AuthUiRegistryInput>('or3:auth-ui-adapter-register', {
        detail: payload
      })
    );
  }
}

export default defineNuxtPlugin(async () => {
  if (import.meta.server) return;

  const runtimeConfig = useRuntimeConfig();
  if (!runtimeConfig.public?.ssrAuthEnabled) return;

  const publicProviderId = runtimeConfig.public?.authProvider;
  if (publicProviderId && publicProviderId !== BASIC_AUTH_PROVIDER_ID) {
    return;
  }

  const componentModule = (await import('../components/SidebarAuthButtonBasic.client.vue')) as {
    default?: Component;
  };
  if (componentModule.default) {
    if (!tryRegisterAuthUiAdapter(componentModule.default)) {
      enqueueAuthUiAdapter(componentModule.default);
    }
  }
});
