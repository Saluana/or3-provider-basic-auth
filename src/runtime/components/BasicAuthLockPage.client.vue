<template>
  <div class="space-y-3">
    <UButton
      block
      size="xl"
      color="primary"
      :icon="loginIcon"
      class="theme-shadow"
      @click="signInModalOpen = true"
    >
      Sign in
    </UButton>

    <p class="text-sm text-[var(--md-on-surface-variant)] text-center">
      Use your email and password to continue.
    </p>

    <BasicAuthSignInModal
      v-model="signInModalOpen"
      @signed-in="handleSignedIn"
      @open-register="openRegisterFromSignIn"
    />

    <BasicAuthRegisterModal
      v-model="registerModalOpen"
      @registered="handleRegistered"
    />
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue';
import BasicAuthRegisterModal from './BasicAuthRegisterModal.client.vue';
import BasicAuthSignInModal from './BasicAuthSignInModal.client.vue';

const loginIcon = 'i-lucide-log-in';

const signInModalOpen = ref(false);
const registerModalOpen = ref(false);

function notifyAuthSessionChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('or3:auth-session-changed'));
}

function handleSignedIn(): void {
  notifyAuthSessionChanged();
}

function handleRegistered(): void {
  notifyAuthSessionChanged();
}

async function openRegisterFromSignIn(): Promise<void> {
  signInModalOpen.value = false;
  await nextTick();
  setTimeout(() => {
    registerModalOpen.value = true;
  }, 0);
}
</script>