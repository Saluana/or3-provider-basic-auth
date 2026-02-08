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

          <UFormField label="New Password" name="newPassword">
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

const modalUi = {
  content: 'sm:max-w-[400px]',
};

const props = defineProps<{
  modelValue: boolean;
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

async function onSubmit(): Promise<void> {
  if (state.newPassword !== state.confirmNewPassword) {
    errorMessage.value = 'Passwords do not match';
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

    emit('updated');
    close();
  } catch {
    errorMessage.value = 'Unable to change password';
  } finally {
    pending.value = false;
  }
}
</script>
