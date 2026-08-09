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

  it('uses injected popover placement when provided by the host', () => {
    const wrapper = mount(BasicAuthUserMenu, {
      props: {
        email: 'user@example.com',
      },
      global: {
        provide: {
          'or3:auth-ui-popover-content': {
            side: 'top',
            align: 'center',
            sideOffset: 8,
          },
        },
        components: {
          UButton: UButtonStub,
          UPopover: defineComponent({
            props: {
              content: { type: Object, default: () => ({}) },
            },
            template:
              '<div :data-side="content.side" :data-align="content.align"><slot /><slot name="content" /></div>',
          }),
          UIcon: true,
        },
      },
    });

    expect(wrapper.find('[data-side="top"]').exists()).toBe(true);
    expect(wrapper.find('[data-align="center"]').exists()).toBe(true);
  });

  it('renders a System-matched more-row when layout prop is more-sheet', () => {
    const UIconStub = defineComponent({
      props: {
        name: { type: String, default: '' },
      },
      template: '<span class="u-icon-stub" :data-name="name" />',
    });

    const wrapper = mount(BasicAuthUserMenu, {
      props: {
        email: 'user@example.com',
        layout: 'more-sheet',
      },
      global: {
        components: {
          UButton: UButtonStub,
          UPopover: UPopoverStub,
          UIcon: UIconStub,
        },
      },
    });

    const trigger = wrapper.find('button.more-row[aria-label="Account menu"]');
    expect(trigger.exists()).toBe(true);
    expect(trigger.find('.more-row-icon').exists()).toBe(true);
    expect(trigger.find('.more-row-label').text()).toBe('Account');
    expect(trigger.find('.more-row-desc').text()).toContain(
      'Manage your profile'
    );
    expect(
      trigger.find('.u-icon-stub[data-name="lucide:chevron-right"]').exists()
    ).toBe(true);
  });
});
