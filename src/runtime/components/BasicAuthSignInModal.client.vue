<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <h3 class="text-base font-semibold">Sign In</h3>
        </template>

        <UForm :state="state" @submit.prevent="onSubmit">
          <div class="space-y-3">
            <UInput v-model="state.email" type="email" placeholder="Email" autocomplete="email" required />
            <UInput
              v-model="state.password"
              type="password"
              placeholder="Password"
              autocomplete="current-password"
              required
            />
            <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="soft" type="button" :disabled="pending" @click="close">
                Cancel
              </UButton>
              <UButton type="submit" :loading="pending">Sign In</UButton>
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
  } catch {
    errorMessage.value = 'Invalid credentials';
  } finally {
    pending.value = false;
  }
}
</script>
