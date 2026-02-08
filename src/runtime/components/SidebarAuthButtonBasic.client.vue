<template>
  <div v-if="isBasicAuthProvider" class="w-full">
    <BasicAuthUserMenu
      v-if="isSignedIn"
      :email="sessionUser?.email"
      :display-name="sessionUser?.displayName"
      @signed-out="onSignedOut"
      @change-password="changePasswordModalOpen = true"
    />

    <UButton v-else block type="button" @click="signInModalOpen = true">
      Login
    </UButton>

    <BasicAuthSignInModal
      v-model="signInModalOpen"
      @signed-in="onSignedIn"
    />

    <BasicAuthChangePasswordModal
      v-model="changePasswordModalOpen"
      @updated="onPasswordUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { BASIC_AUTH_PROVIDER_ID } from '../lib/constants';
import BasicAuthSignInModal from './BasicAuthSignInModal.client.vue';
import BasicAuthUserMenu from './BasicAuthUserMenu.client.vue';
import BasicAuthChangePasswordModal from './BasicAuthChangePasswordModal.client.vue';

const runtimeConfig = useRuntimeConfig();
const signInModalOpen = ref(false);
const changePasswordModalOpen = ref(false);
const session = ref<{
  authenticated?: boolean;
  provider?: string;
  user?: {
    id?: string;
    email?: string;
    displayName?: string;
  };
} | null>(null);

async function refreshSession(): Promise<void> {
  try {
    const payload = await $fetch<{ session: typeof session.value }>('/api/auth/session', {
      cache: 'no-store'
    });
    session.value = payload.session ?? null;
  } catch {
    session.value = null;
  }
}

const isBasicAuthProvider = computed(() => {
  const publicProvider = runtimeConfig.public?.authProvider;
  if (!publicProvider) return true;
  return publicProvider === BASIC_AUTH_PROVIDER_ID;
});

const isSignedIn = computed(
  () => session.value?.authenticated === true && session.value.provider === BASIC_AUTH_PROVIDER_ID
);
const sessionUser = computed(() => session.value?.user);

async function onSignedIn(): Promise<void> {
  await refreshSession();
}

async function onSignedOut(): Promise<void> {
  await refreshSession();
}

async function onPasswordUpdated(): Promise<void> {
  await refreshSession();
}

onMounted(() => {
  void refreshSession();
});
</script>
