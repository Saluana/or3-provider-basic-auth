import { defineComponent } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, shallowMount } from '@vue/test-utils';
import SidebarAuthButtonBasic from '../SidebarAuthButtonBasic.client.vue';
import BasicAuthUserMenu from '../BasicAuthUserMenu.client.vue';
import BasicAuthRegisterModal from '../BasicAuthRegisterModal.client.vue';
import { resetInviteLinkForTests } from '../../lib/invite-link.client';
import {
  resetTestSession,
  setTestRefresh,
  setTestSession
} from '../../../test-shims/session-context';

const UButtonStub = defineComponent({
  template: '<button type="button"><slot /></button>'
});

const signedInSession = {
  session: {
    authenticated: true,
    provider: 'basic-auth',
    user: { email: 'user@example.com' }
  }
};

describe('SidebarAuthButtonBasic', () => {
  beforeEach(() => {
    resetTestSession();
    (globalThis as typeof globalThis & { useRuntimeConfig?: unknown }).useRuntimeConfig = () => ({
      public: {
        authProvider: 'basic-auth',
        ssrAuthEnabled: true
      }
    });
  });

  it('renders login path when signed out, without fetching its own session', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('$fetch', fetchMock);
    setTestSession({ session: null });

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
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('renders the signed-out action as a more-row when requested by the host', async () => {
    setTestSession({ session: null });

    const wrapper = shallowMount(SidebarAuthButtonBasic, {
      props: { layout: 'more-sheet' },
      global: {
        stubs: {
          UButton: UButtonStub,
          UIcon: true,
          BasicAuthSignInModal: true,
          BasicAuthRegisterModal: true,
          BasicAuthChangePasswordModal: true,
          BasicAuthUserMenu: true
        }
      }
    });

    await flushPromises();

    const login = wrapper.get('button.more-row[aria-label="Login"]');
    expect(login.find('.more-row-label').text()).toBe('Login');
    expect(login.find('.more-row-desc').text()).toContain('Manage your profile');
  });

  it('forwards more-sheet layout to the signed-in account menu', async () => {
    setTestSession(signedInSession);

    const wrapper = shallowMount(SidebarAuthButtonBasic, {
      props: { layout: 'more-sheet' },
      global: {
        stubs: {
          UButton: UButtonStub,
          BasicAuthSignInModal: true,
          BasicAuthRegisterModal: true,
          BasicAuthChangePasswordModal: true
        }
      }
    });

    await flushPromises();

    expect(wrapper.getComponent(BasicAuthUserMenu).props('layout')).toBe(
      'more-sheet'
    );
  });

  describe('invite links', () => {
    const mountButton = (layout?: 'rail' | 'more-sheet') => shallowMount(SidebarAuthButtonBasic, {
      props: layout ? { layout } : {},
      global: { stubs: { UButton: UButtonStub, UIcon: true, BasicAuthSignInModal: true,
        BasicAuthChangePasswordModal: true, BasicAuthUserMenu: true } }
    });
    beforeEach(() => {
      resetInviteLinkForTests();
      window.history.replaceState(null, '', '/?invite=invite-token');
    });

    it('opens registration with the token filled in for a signed-out visitor, once per link', async () => {
      setTestSession({ session: null });
      const rail = mountButton();
      const sheet = mountButton('more-sheet');
      await flushPromises();
      const modals = [rail, sheet].map((wrapper) => wrapper.getComponent(BasicAuthRegisterModal));
      expect(modals.map((modal) => modal.props('modelValue'))).toEqual([true, false]);
      expect(modals.map((modal) => modal.props('inviteToken'))).toEqual(['invite-token', 'invite-token']);
      expect(window.location.search).toBe('');
    });

    it('leaves a signed-in user where they are', async () => {
      setTestSession(signedInSession);
      const wrapper = mountButton();
      await flushPromises();
      expect(wrapper.findComponent(BasicAuthRegisterModal).props('modelValue')).toBe(false);
    });
  });

  it('shows the account menu once the shared session becomes signed in', async () => {
    setTestSession({ session: null });

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
    expect(wrapper.find('basic-auth-user-menu-stub').exists()).toBe(false);

    // The host refreshes the shared session (for example after silent token
    // recovery); the button follows it without any request of its own.
    setTestSession(signedInSession);
    await flushPromises();

    expect(wrapper.find('basic-auth-user-menu-stub').exists()).toBe(true);
  });

  it('announces an auth event and leaves refreshing the shared session to the host', async () => {
    // The host decides whether to reload by comparing the session before and
    // after its own refresh, so the button must not refresh it first.
    setTestSession(signedInSession);
    const refresh = vi.fn(async () => undefined);
    setTestRefresh(refresh);
    const changed = vi.fn();
    window.addEventListener('or3:auth-session-changed', changed);

    const wrapper = shallowMount(SidebarAuthButtonBasic, {
      global: {
        stubs: {
          UButton: UButtonStub,
          BasicAuthSignInModal: true,
          BasicAuthChangePasswordModal: true
        }
      }
    });
    await flushPromises();

    wrapper.getComponent(BasicAuthUserMenu).vm.$emit('signed-out');
    await flushPromises();
    window.removeEventListener('or3:auth-session-changed', changed);

    expect(changed).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });
});
