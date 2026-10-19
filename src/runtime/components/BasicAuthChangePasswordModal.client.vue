<template>
  <UModal
    v-model:open="isOpen"
    title="Change Password"
    description="Update your account password"
    :ui="modalUi"
  >
    <template #body>
      <UForm :state="state" @submit.prevent="onSubmit">
        <div class="flex flex-col gap-4">
          <input
            :value="props.username ?? ''"
            type="text"
            autocomplete="username"
            tabindex="-1"
            aria-hidden="true"
            class="sr-only pointer-events-none h-0 w-0 opacity-0"
            readonly
          />

          <UFormField label="Current Password" name="currentPassword">
            <UInput
              v-model="state.currentPassword"
              type="password"
              placeholder="••••••••"
              autocomplete="current-password"
              required
              class="w-full"
            />
          </UFormField>

          <USeparator />

          <UFormField label="New Password" name="newPassword" hint="Use at least 8 characters">
            <UInput
              v-model="state.newPassword"
              type="password"
              placeholder="••••••••"
              autocomplete="new-password"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField label="Confirm New Password" name="confirmNewPassword">
            <UInput
              v-model="state.confirmNewPassword"
              type="password"
              placeholder="••••••••"
              autocomplete="new-password"
              required
              class="w-full"
            />
          </UFormField>

          <p class="text-xs opacity-70">
            For your security, changing your password signs you out on all devices.
          </p>

          <div
            v-if="errorMessage"
            role="alert"
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
            <UButton type="submit" :loading="pending">
              Update Password
            </UButton>
          </div>
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { PASSWORD_UPDATED_NOTICE_KEY } from '../lib/constants';
import { newPasswordFitsBcrypt } from '../password-policy';

const modalUi = {
  overlay: 'basic-auth-modal-overlay',
  content: 'basic-auth-modal-content sm:max-w-[400px]',
};

const props = defineProps<{
  modelValue: boolean;
  username?: string;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
  (event: 'updated'): void;
}>();

const pending = ref(false);
const errorMessage = ref('');
const state = reactive({
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: ''
});

const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
});

function close(): void {
  errorMessage.value = '';
  emit('update:modelValue', false);
}

/** Turns a failed request into a message that says what happened and what to do. */
function describeError(error: unknown): string {
  const failure = error as {
    statusCode?: number;
    data?: { statusMessage?: string };
    response?: { headers?: { get?: (name: string) => string | null } };
  } | null;
  const status = Number(failure?.statusCode);
  const serverMessage = failure?.data?.statusMessage;

  if (status === 401) {
    return serverMessage === 'Session expired'
      ? 'Your session has expired. Sign in again to change your password.'
      : 'Your current password is incorrect.';
  }
  if (status === 429) {
    const seconds = Number(failure?.response?.headers?.get?.('retry-after'));
    return seconds > 0
      ? `Too many attempts. Try again in ${seconds} seconds.`
      : 'Too many attempts. Please wait a minute and try again.';
  }
  if (status === 400 && serverMessage && serverMessage !== 'Invalid request') {
    return serverMessage;
  }
  return 'Unable to change password right now. Please try again.';
}

async function onSubmit(): Promise<void> {
  if (state.newPassword.length < 8) {
    errorMessage.value = 'New password must be at least 8 characters.';
    return;
  }
  if (!newPasswordFitsBcrypt(state.newPassword)) {
    errorMessage.value = 'Password is too long. Please shorten it.';
    return;
  }
  if (state.newPassword !== state.confirmNewPassword) {
    errorMessage.value = 'Passwords must match.';
    return;
  }

  pending.value = true;
  errorMessage.value = '';

  try {
    await $fetch('/api/basic-auth/change-password', {
      method: 'POST',
      body: {
        currentPassword: state.currentPassword,
        newPassword: state.newPassword,
        confirmNewPassword: state.confirmNewPassword
      }
    });

    try {
      sessionStorage.setItem(PASSWORD_UPDATED_NOTICE_KEY, '1');
    } catch {
      // The notice is a courtesy; private modes may block storage.
    }
    emit('updated');
    close();
  } catch (error) {
    errorMessage.value = describeError(error);
  } finally {
    pending.value = false;
  }
}
</script>
