<template>
  <UModal
    v-model:open="isOpen"
    title="Create Account"
    description="Register a new account"
    :close="{
      class: 'theme-btn',
      size: 'sm'
    }"
    :ui="modalUi"
  >
    <template #body>
      <UForm :state="state" @submit.prevent="onSubmit">
        <div class="flex flex-col gap-4">
          <UFormField label="Email" name="email">
            <UInput
              v-model="state.email"
              type="email"
              placeholder="you@example.com"
              autocomplete="email"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField label="Display name" name="displayName">
            <UInput
              v-model="state.displayName"
              type="text"
              placeholder="Your name"
              autocomplete="name"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Password" name="password">
            <UInput
              v-model="state.password"
              type="password"
              placeholder="••••••••"
              autocomplete="new-password"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField label="Confirm password" name="confirmPassword">
            <UInput
              v-model="state.confirmPassword"
              type="password"
              placeholder="••••••••"
              autocomplete="new-password"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField label="Invite token (optional)" name="inviteToken">
            <UInput
              v-model="state.inviteToken"
              type="text"
              placeholder="paste invite token"
              class="w-full"
            />
          </UFormField>

          <div
            v-if="errorMessage"
            class="flex items-start gap-2 rounded-[var(--md-border-radius)] border border-[var(--md-error)]/30 bg-[var(--md-error)]/8 px-3 py-2.5 text-sm text-[var(--md-error)]"
          >
            <UIcon name="i-lucide-alert-circle" class="w-4 h-4 mt-0.5 shrink-0" />
            {{ errorMessage }}
          </div>

          <div class="flex justify-end gap-2 pt-1">
            <UButton
              color="neutral"
              variant="outline"
              type="button"
              :disabled="pending"
              @click="close"
            >
              Cancel
            </UButton>
            <UButton class="theme-btn new-act-btn" type="submit" :loading="pending">
              Create account
            </UButton>
          </div>
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

const modalUi = {
  content: 'sm:max-w-[420px]',
};

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
  (event: 'registered'): void;
}>();

const state = reactive({
  email: '',
  displayName: '',
  password: '',
  confirmPassword: '',
  inviteToken: ''
});
const pending = ref(false);
const errorMessage = ref('');

const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => {
    emit('update:modelValue', value);
  }
});

function close(): void {
  errorMessage.value = '';
  emit('update:modelValue', false);
}

async function onSubmit(): Promise<void> {
  pending.value = true;
  errorMessage.value = '';

  try {
    await $fetch('/api/basic-auth/register', {
      method: 'POST',
      body: {
        email: state.email,
        displayName: state.displayName || undefined,
        password: state.password,
        confirmPassword: state.confirmPassword,
        inviteToken: state.inviteToken || undefined,
      }
    });

    emit('registered');
    close();
  } catch (error) {
    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error
        ? Number((error as { statusCode?: number }).statusCode)
        : null;
    if (statusCode === 400) {
      errorMessage.value = 'Please check your input and try again.';
    } else if (statusCode === 403) {
      errorMessage.value = 'Registration is restricted for this instance.';
    } else if (statusCode === 409) {
      errorMessage.value = 'Email is already in use.';
    } else {
      errorMessage.value = 'Unable to register right now. Please try again.';
    }
  } finally {
    pending.value = false;
  }
}
</script>
