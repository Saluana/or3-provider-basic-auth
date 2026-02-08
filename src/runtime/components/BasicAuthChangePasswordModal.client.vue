<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <h3 class="text-base font-semibold">Change Password</h3>
        </template>

        <UForm :state="state" @submit.prevent="onSubmit">
          <div class="space-y-3">
            <UInput
              v-model="state.currentPassword"
              type="password"
              placeholder="Current password"
              autocomplete="current-password"
              required
            />
            <UInput
              v-model="state.newPassword"
              type="password"
              placeholder="New password"
              autocomplete="new-password"
              required
            />
            <UInput
              v-model="state.confirmNewPassword"
              type="password"
              placeholder="Confirm new password"
              autocomplete="new-password"
              required
            />
            <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="soft" type="button" :disabled="pending" @click="close">
                Cancel
              </UButton>
              <UButton type="submit" :loading="pending">Update Password</UButton>
            </div>
          </div>
        </UForm>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

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
