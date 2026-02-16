<template>
  <template v-if="isBasicAuthProvider">
    <BasicAuthUserMenu
      v-if="isSignedIn"
      :email="sessionUser?.email"
      :display-name="sessionUser?.displayName"
      @signed-out="onSignedOut"
      @change-password="changePasswordModalOpen = true"
    />

    <UButton
      v-else
      v-bind="loginButtonProps"
      type="button"
      aria-label="Login"
      @click="signInModalOpen = true"
    >
      <template #default>
        <span class="flex flex-col items-center gap-1 w-full">
          <UIcon name="i-lucide-log-in" class="h-[18px] w-[18px]" />
          <span class="text-[7px] uppercase tracking-wider whitespace-nowrap">
            Login
          </span>
        </span>
      </template>
    </UButton>

    <BasicAuthSignInModal
      v-model="signInModalOpen"
      @signed-in="onSignedIn"
      @open-register="openRegisterFromSignIn"
    />

    <BasicAuthRegisterModal
      v-model="registerModalOpen"
      @registered="onRegistered"
    />

    <BasicAuthChangePasswordModal
      v-model="changePasswordModalOpen"
      :username="sessionUser?.email"
      @updated="onPasswordUpdated"
    />
  </template>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { BASIC_AUTH_PROVIDER_ID } from '../lib/constants';
import BasicAuthSignInModal from './BasicAuthSignInModal.client.vue';
import BasicAuthRegisterModal from './BasicAuthRegisterModal.client.vue';
import BasicAuthUserMenu from './BasicAuthUserMenu.client.vue';
import BasicAuthChangePasswordModal from './BasicAuthChangePasswordModal.client.vue';

const runtimeConfig = useRuntimeConfig();
const signInModalOpen = ref(false);
const registerModalOpen = ref(false);
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
      const response = await $fetch<{ ok?: boolean }>('/api/basic-auth/refresh?silent=1', {
        method: 'POST'
      });
      return response?.ok === true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshRequest = null;
  });

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
const loginButtonProps = {
  block: true,
  variant: 'ghost' as const,
  color: 'neutral' as const,
  class:
    'theme-btn h-[48px] w-[48px] p-0! flex flex-col items-center justify-center gap-1 py-1.5 bg-transparent border-[length:var(--md-border-width)] border-[color:var(--md-primary)]/30 rounded-[var(--md-border-radius)] text-[var(--md-primary)] hover:bg-[var(--md-primary)]/15 active:bg-[var(--md-primary)]/25 transition-colors duration-150 shadow-none',
  ui: {
    base: 'justify-center shadow-none'
  }
};

function notifyAuthSessionChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('or3:auth-session-changed'));
}

async function onSignedIn(): Promise<void> {
  await refreshSession({ allowSilentRefresh: false });
  notifyAuthSessionChanged();
}

async function onSignedOut(): Promise<void> {
  await refreshSession({ allowSilentRefresh: false });
  notifyAuthSessionChanged();
}

async function onPasswordUpdated(): Promise<void> {
  await refreshSession({ allowSilentRefresh: false });
  notifyAuthSessionChanged();
}

async function openRegisterFromSignIn(): Promise<void> {
  signInModalOpen.value = false;
  await nextTick();
  setTimeout(() => {
    registerModalOpen.value = true;
  }, 0);
}

async function onRegistered(): Promise<void> {
  await refreshSession({ allowSilentRefresh: false });
  notifyAuthSessionChanged();
}

onMounted(() => {
  void refreshSession();
});
</script>
