import { defineComponent } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import BasicAuthRegisterModal from '../BasicAuthRegisterModal.client.vue';

const components = {
  UModal: defineComponent({
    props: { open: { type: Boolean, default: false } },
    template: '<div v-if="open"><slot name="body" /></div>'
  }),
  UFormField: defineComponent({
    props: { label: String, name: String, hint: String },
    template: '<label :data-name="name">{{ label }}<slot /></label>'
  }),
  UForm: defineComponent({
    emits: ['submit'],
    template: '<form @submit.prevent="$emit(\'submit\', $event)"><slot /></form>'
  }),
  UInput: defineComponent({
    props: { modelValue: { type: String, default: '' } },
    emits: ['update:modelValue'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  }),
  UButton: defineComponent({ template: '<button type="submit"><slot /></button>' }),
  UIcon: defineComponent({ template: '<span />' })
};

describe('BasicAuthRegisterModal', () => {
  // An invite link used to open a form whose token field was empty and
  // labelled optional, so invite-only registration failed.
  it('fills in and sends the token from an invite link', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('$fetch', fetchMock);
    const wrapper = mount(BasicAuthRegisterModal, {
      props: { modelValue: false, inviteToken: 'link-token' },
      global: { components }
    });
    await wrapper.setProps({ modelValue: true });
    const field = wrapper.get('[data-name="inviteToken"]');
    expect(field.text()).toBe('Invite token (from your invite link)');
    expect((field.get('input').element as HTMLInputElement).value).toBe('link-token');

    const inputs = wrapper.findAll('input:not([readonly])');
    await inputs[0]!.setValue('new@example.com');
    await inputs[2]!.setValue('long enough password');
    await inputs[3]!.setValue('long enough password');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledWith('/api/basic-auth/register', expect.objectContaining({
      body: expect.objectContaining({ inviteToken: 'link-token' })
    }));
  });

  it('keeps the optional field empty without an invite link', async () => {
    const wrapper = mount(BasicAuthRegisterModal, { props: { modelValue: true }, global: { components } });
    const field = wrapper.get('[data-name="inviteToken"]');
    expect(field.text()).toBe('Invite token (optional)');
    expect((field.get('input').element as HTMLInputElement).value).toBe('');
  });
});
