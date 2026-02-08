import type { Component } from 'vue';
import { BASIC_AUTH_PROVIDER_ID } from '../lib/constants';

type AuthUiRegistryModule = {
  registerAuthUiAdapter?: (input: { id: string; component: Component }) => void;
};

async function tryRegisterAuthUiAdapter(component: Component): Promise<void> {
  try {
    const mod = (await import('~/core/auth-ui/registry')) as AuthUiRegistryModule;
    if (typeof mod.registerAuthUiAdapter === 'function') {
      mod.registerAuthUiAdapter({
        id: BASIC_AUTH_PROVIDER_ID,
        component
      });
    }
  } catch {
    // Auth UI registry is introduced in the provider-decoupling phase.
    // Ignore in older host versions where this module does not exist.
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

  const componentModulePath = '../components/SidebarAuthButtonBasic.client.vue';
  const componentModule = (await import(componentModulePath)) as {
    default?: Component;
  };
  if (componentModule.default) {
    await tryRegisterAuthUiAdapter(componentModule.default);
  }
});
