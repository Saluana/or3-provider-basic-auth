import { defineComponent } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import SidebarAuthButtonBasic from '../SidebarAuthButtonBasic.client.vue';

const UButtonStub = defineComponent({
  template: '<button type="button"><slot /></button>'
});

describe('SidebarAuthButtonBasic', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { useRuntimeConfig?: unknown }).useRuntimeConfig = () => ({
      public: {
        authProvider: 'basic-auth',
        ssrAuthEnabled: true
      }
    });
  });

  it('renders login path when signed out', async () => {
    vi.stubGlobal('$fetch', vi.fn(async () => ({ session: null })));

    const wrapper = shallowMount(SidebarAuthButtonBasic, {
      global: {
        stubs: {
          UButton: UButtonStub,
          BasicAuthSignInModal: true,
          BasicAuthChangePasswordModal: true,
          BasicAuthUserMenu: true
        }
      }
    });

    await Promise.resolve();

    expect(wrapper.text()).toContain('Login');
  });

  it('renders signed-in menu when authenticated with basic-auth provider', async () => {
    vi.stubGlobal(
      '$fetch',
      vi.fn(async () => ({
        session: {
          authenticated: true,
          provider: 'basic-auth',
          user: {
            email: 'user@example.com'
          }
        }
      }))
    );

    const wrapper = shallowMount(SidebarAuthButtonBasic, {
      global: {
        stubs: {
          UButton: UButtonStub,
          BasicAuthSignInModal: true,
          BasicAuthChangePasswordModal: true,
          BasicAuthUserMenu: true
        }
      }
    });

    await Promise.resolve();
    await Promise.resolve();
    await wrapper.vm.$nextTick();

    expect(wrapper.find('basic-auth-user-menu-stub').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Login');
  });
});
