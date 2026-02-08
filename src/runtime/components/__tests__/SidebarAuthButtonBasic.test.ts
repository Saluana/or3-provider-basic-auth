import { defineComponent } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, shallowMount } from '@vue/test-utils';
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
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/auth/session') {
        return { session: null };
      }

      if (url === '/api/basic-auth/refresh?silent=1') {
        return { ok: false };
      }

      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal('$fetch', fetchMock);

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

    await flushPromises();

    expect(wrapper.text()).toContain('Login');
    expect(fetchMock).toHaveBeenCalledWith('/api/basic-auth/refresh?silent=1', {
      method: 'POST'
    });
  });

  it('renders signed-in menu when authenticated with basic-auth provider', async () => {
    const fetchMock = vi.fn(async () => ({
      session: {
        authenticated: true,
        provider: 'basic-auth',
        user: {
          email: 'user@example.com'
        }
      }
    }));
    vi.stubGlobal(
      '$fetch',
      fetchMock
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

    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.find('basic-auth-user-menu-stub').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Login');
    expect(fetchMock).not.toHaveBeenCalledWith('/api/basic-auth/refresh?silent=1', {
      method: 'POST'
    });
  });

  it('silently refreshes tokens when session endpoint returns null', async () => {
    let sessionCalls = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/basic-auth/refresh?silent=1') {
        return { ok: true };
      }

      if (url === '/api/auth/session') {
        sessionCalls += 1;
        if (sessionCalls === 1) {
          return { session: null };
        }

        return {
          session: {
            authenticated: true,
            provider: 'basic-auth',
            user: {
              email: 'user@example.com'
            }
          }
        };
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal('$fetch', fetchMock);

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

    await flushPromises();
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(fetchMock).toHaveBeenCalledWith('/api/basic-auth/refresh?silent=1', {
      method: 'POST'
    });
    expect(wrapper.find('basic-auth-user-menu-stub').exists()).toBe(true);
  });
});
