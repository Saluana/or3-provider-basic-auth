<template>
  <UPopover
    v-model:open="isOpen"
    portal
    :content="{ side: 'right', align: 'end', sideOffset: 10 }"
    :ui="{ content: 'z-[260] max-w-[240px] p-0 border-none bg-transparent shadow-none' }"
  >
    <UButton
      v-bind="triggerButtonProps"
      type="button"
      aria-label="Account menu"
    >
      <template #default>
        <span class="flex flex-col items-center gap-1 w-full">
          <UIcon name="i-lucide-user-check" class="h-[18px] w-[18px]" />
          <span class="text-[7px] uppercase tracking-wider whitespace-nowrap">
            Account
          </span>
        </span>
      </template>
    </UButton>

    <template #content>
      <div
        class="w-[220px] rounded-[var(--md-border-radius)] border-[length:var(--md-border-width)] border-[color:var(--md-border-color)] bg-[var(--md-surface)] overflow-hidden theme-shadow"
      >
        <!-- User identity section -->
        <div class="px-4 pt-4 pb-3">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--md-success)]/15 text-[var(--md-success)] shrink-0">
              <UIcon name="i-lucide-user" class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <p class="text-[10px] uppercase tracking-wider text-[var(--md-on-surface)]/50 mb-0.5">
                Signed in as
              </p>
              <p class="text-xs font-medium text-[var(--md-on-surface)] break-all leading-tight">
                {{ email }}
              </p>
            </div>
          </div>
        </div>

        <div class="h-[var(--md-border-width)] bg-[var(--md-border-color)] mx-3" />

        <!-- Actions -->
        <div class="p-2 space-y-1">
          <button
            type="button"
            class="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--md-on-surface)] rounded-[var(--md-border-radius)] hover:bg-[var(--md-surface-hover)] active:bg-[var(--md-surface-active)] transition-colors text-left"
            @click="onChangePassword"
          >
            <UIcon name="i-lucide-key-round" class="w-4 h-4 text-[var(--md-on-surface)]/60 shrink-0" />
            Change Password
          </button>

          <button
            type="button"
            :disabled="pending"
            class="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-[var(--md-border-radius)] text-[var(--md-error)] hover:bg-[var(--md-error)]/10 active:bg-[var(--md-error)]/18 transition-colors text-left disabled:opacity-50"
            @click="onSignOut"
          >
            <UIcon name="i-lucide-log-out" class="w-4 h-4 shrink-0" />
            {{ pending ? 'Signing out…' : 'Sign Out' }}
          </button>
        </div>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  email?: string;
  displayName?: string;
}>();

const emit = defineEmits<{
  (event: 'signed-out'): void;
  (event: 'change-password'): void;
}>();

const isOpen = ref(false);
const pending = ref(false);

const triggerButtonProps = {
  block: true,
  variant: 'ghost' as const,
  color: 'neutral' as const,
  class:
    'theme-btn h-[48px] w-[48px] p-0! flex flex-col items-center justify-center gap-1 py-1.5 bg-transparent border-[length:var(--md-border-width)] border-[color:var(--md-success)]/40 rounded-[var(--md-border-radius)] text-[var(--md-on-surface)] hover:bg-[var(--md-success)]/18 active:bg-[var(--md-success)]/28 transition-colors duration-150 shadow-none',
  ui: {
    base: 'justify-center shadow-none'
  }
};

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
