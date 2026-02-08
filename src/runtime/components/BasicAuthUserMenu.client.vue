<template>
  <div class="relative">
    <UButton type="button" block @click="toggleMenu">
      <span class="truncate">{{ label }}</span>
    </UButton>

    <div
      v-if="isOpen"
      class="absolute bottom-14 left-0 z-30 w-56 rounded border border-neutral-300 bg-white p-2 shadow"
    >
      <div class="mb-2 px-2 py-1 text-xs text-neutral-500">Signed in as</div>
      <div class="mb-3 px-2 text-sm font-medium break-all">{{ email }}</div>

      <div class="space-y-2">
        <UButton block color="neutral" variant="soft" type="button" @click="onChangePassword">
          Change Password
        </UButton>
        <UButton block color="error" variant="soft" type="button" :loading="pending" @click="onSignOut">
          Sign Out
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
  email?: string;
  displayName?: string;
}>();

const emit = defineEmits<{
  (event: 'signed-out'): void;
  (event: 'change-password'): void;
}>();

const isOpen = ref(false);
const pending = ref(false);

const label = computed(() => props.displayName || props.email || 'Account');

function toggleMenu(): void {
  isOpen.value = !isOpen.value;
}

function onChangePassword(): void {
  isOpen.value = false;
  emit('change-password');
}

async function onSignOut(): Promise<void> {
  pending.value = true;
  try {
    await $fetch('/api/basic-auth/sign-out', {
      method: 'POST'
    });
    emit('signed-out');
  } finally {
    pending.value = false;
    isOpen.value = false;
  }
}
</script>
