import { defineComponent } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import BasicAuthChangePasswordModal from '../BasicAuthChangePasswordModal.client.vue';

const UModalStub = defineComponent({
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: '' },
    description: { type: String, default: '' }
  },
  template: '<div v-if="open"><slot name="body" /></div>'
});

const UFormFieldStub = defineComponent({
  props: { label: String, name: String },
  template: '<div><slot /></div>'
});

const UFormStub = defineComponent({
  emits: ['submit'],
  template: '<form @submit.prevent="$emit(\'submit\', $event)"><slot /></form>'
});

const UInputStub = defineComponent({
  props: {
    modelValue: { type: String, default: '' }
  },
  emits: ['update:modelValue'],
  template:
    '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
});

const UButtonStub = defineComponent({
  emits: ['click'],
  template: '<button type="button" @click="$emit(\'click\')"><slot /></button>'
});

describe('BasicAuthChangePasswordModal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('$fetch', vi.fn(async () => ({ ok: true })));
  });

  it('submits successfully and emits updated event', async () => {
    const wrapper = mount(BasicAuthChangePasswordModal, {
      props: {
        modelValue: true
      },
      global: {
        components: {
          UModal: UModalStub,
          UFormField: UFormFieldStub,
          UForm: UFormStub,
          UInput: UInputStub,
          UButton: UButtonStub,
          USeparator: defineComponent({ template: '<hr />' }),
          UIcon: defineComponent({ template: '<span />' })
        }
      }
    });

    const inputs = wrapper.findAll('input');
    await inputs[0]?.setValue('old-password-123');
    await inputs[1]?.setValue('new-password-123');
    await inputs[2]?.setValue('new-password-123');

    await wrapper.find('form').trigger('submit');
    await Promise.resolve();

    expect(($fetch as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      '/api/basic-auth/change-password',
      {
        method: 'POST',
        body: {
          currentPassword: 'old-password-123',
          newPassword: 'new-password-123',
          confirmNewPassword: 'new-password-123'
        }
      }
    );

    expect(wrapper.emitted('updated')).toBeTruthy();
  });

  it('shows error text when request fails', async () => {
    vi.stubGlobal(
      '$fetch',
      vi.fn(async () => {
        throw new Error('boom');
      })
    );

    const wrapper = mount(BasicAuthChangePasswordModal, {
      props: {
        modelValue: true
      },
      global: {
        components: {
          UModal: UModalStub,
          UFormField: UFormFieldStub,
          UForm: UFormStub,
          UInput: UInputStub,
          UButton: UButtonStub,
          USeparator: defineComponent({ template: '<hr />' }),
          UIcon: defineComponent({ template: '<span />' })
        }
      }
    });

    const inputs = wrapper.findAll('input');
    await inputs[0]?.setValue('old-password-123');
    await inputs[1]?.setValue('new-password-123');
    await inputs[2]?.setValue('new-password-123');

    await wrapper.find('form').trigger('submit');
    await Promise.resolve();

    expect(wrapper.text()).toContain('Unable to change password');
  });
});
