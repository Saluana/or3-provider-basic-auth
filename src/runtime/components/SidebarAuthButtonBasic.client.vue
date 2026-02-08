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
let refreshRequest: Promise<boolean> | null = null;

type SessionData = {
  authenticated?: boolean;
  provider?: string;
  user?: {
    id?: string;
    email?: string;
    displayName?: string;
  };
};

type SessionPayload = {
  session: SessionData | null;
};

const session = ref<SessionData | null>(null);

async function fetchSessionPayload(): Promise<SessionPayload> {
  return await $fetch<SessionPayload>('/api/auth/session', {
    cache: 'no-store'
  });
}

async function tryRefreshTokens(): Promise<boolean> {
  if (refreshRequest) {
    return refreshRequest;
  }

  refreshRequest = (async () => {
    try {
      await $fetch('/api/basic-auth/refresh', {
        method: 'POST'
      });
      return true;
    } catch {
      return false;
    } finally {
      refreshRequest = null;
    }
  })();

  return refreshRequest;
}

async function refreshSession(options: { allowSilentRefresh?: boolean } = {}): Promise<void> {
  const allowSilentRefresh = options.allowSilentRefresh ?? true;

  try {
    const payload = await fetchSessionPayload();
    session.value = payload.session ?? null;
  } catch {
    session.value = null;
    return;
  }

  if (session.value || !allowSilentRefresh) {
    return;
  }

  const didRefresh = await tryRefreshTokens();
  if (!didRefresh) {
    return;
  }

  try {
    const payload = await fetchSessionPayload();
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
  await refreshSession({ allowSilentRefresh: false });
}

async function onSignedOut(): Promise<void> {
  await refreshSession({ allowSilentRefresh: false });
}

async function onPasswordUpdated(): Promise<void> {
  await refreshSession({ allowSilentRefresh: false });
}

onMounted(() => {
  void refreshSession();
});
</script>
