<template>
  <UModal
    v-model:open="isOpen"
    title="Sign In"
    description="Enter your credentials to continue"
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

          <UFormField label="Password" name="password">
            <UInput
              v-model="state.password"
              type="password"
              placeholder="••••••••"
              autocomplete="current-password"
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
              Sign In
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
  content: 'sm:max-w-[380px]',
};

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
  (event: 'signed-in'): void;
}>();

const state = reactive({
  email: '',
  password: ''
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
    await $fetch('/api/basic-auth/sign-in', {
      method: 'POST',
      body: {
        email: state.email,
        password: state.password
      }
    });

    emit('signed-in');
    close();
  } catch (error) {
    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error
        ? Number((error as { statusCode?: number }).statusCode)
        : null;
    if (statusCode === 400) {
      errorMessage.value = 'Please enter a valid email and password.';
    } else if (statusCode === 401) {
      errorMessage.value = 'Invalid credentials';
    } else {
      errorMessage.value = 'Unable to sign in right now. Please try again.';
    }
  } finally {
    pending.value = false;
  }
}
</script>
