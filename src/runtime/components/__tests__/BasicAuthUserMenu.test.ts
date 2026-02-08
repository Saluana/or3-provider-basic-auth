import { defineComponent } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import BasicAuthUserMenu from '../BasicAuthUserMenu.client.vue';

const UPopoverStub = defineComponent({
  template: '<div><slot /><slot name="content" /></div>'
});

const UButtonStub = defineComponent({
  emits: ['click'],
  props: {
    loading: { type: Boolean, default: false }
  },
  template: '<button type="button" @click="$emit(\'click\')"><slot /></button>'
});

describe('BasicAuthUserMenu', () => {
  beforeEach(() => {
    vi.stubGlobal('$fetch', vi.fn(async () => ({ ok: true })));
  });

  it('renders logout path and emits signed-out after successful sign-out', async () => {
    const wrapper = mount(BasicAuthUserMenu, {
      props: {
        email: 'user@example.com',
        displayName: 'User'
      },
      global: {
        components: {
          UButton: UButtonStub,
          UPopover: UPopoverStub,
          UIcon: true
        }
      }
    });

    const buttons = wrapper.findAll('button');
    await buttons[0]?.trigger('click');

    expect(wrapper.text()).toContain('Sign Out');

    const signOutButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Sign Out'));

    await signOutButton?.trigger('click');

    expect(($fetch as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      '/api/basic-auth/sign-out',
      { method: 'POST' }
    );

    expect(wrapper.emitted('signed-out')).toBeTruthy();
  });
});
