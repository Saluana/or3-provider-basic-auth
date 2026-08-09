<template>
  <template v-if="isBasicAuthProvider">
    <BasicAuthUserMenu
      v-if="isSignedIn"
      :email="sessionUser?.email"
      :display-name="sessionUser?.displayName"
      :layout="resolvedLayout"
      @signed-out="onSignedOut"
      @change-password="changePasswordModalOpen = true"
    />

    <button
      v-else-if="isMoreSheetLayout"
      type="button"
      class="more-row"
      aria-label="Login"
      @click="signInModalOpen = true"
    >
      <span class="more-row-icon more-row-icon--admin" aria-hidden="true">
        <UIcon name="lucide:log-in" />
      </span>
      <span class="more-row-copy">
        <span class="more-row-label">Login</span>
        <span class="more-row-desc">Manage your profile & settings</span>
      </span>
      <UIcon
        name="lucide:chevron-right"
        class="more-row-chevron"
        aria-hidden="true"
      />
    </button>

    <UButton
      v-else
      v-bind="loginButtonProps"
      type="button"
      aria-label="Login"
      @click="signInModalOpen = true"
    >
      <template #default>
        <span class="flex flex-col items-center gap-1 w-full">
          <UIcon name="lucide:log-in" class="h-[18px] w-[18px]" />
          <span
            class="sidebar-rail-caption text-[7px] uppercase tracking-wider whitespace-nowrap"
          >
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
import { computed, inject, nextTick, onMounted, ref, unref } from 'vue';
import { useRuntimeConfig } from '#imports';
import { BASIC_AUTH_PROVIDER_ID } from '../lib/constants';
import {
  AUTH_UI_LAYOUT_KEY,
  type AuthUiLayout,
} from '../lib/auth-ui-layout';
import { silentRefreshOnce } from '../lib/silent-refresh.client';
import BasicAuthSignInModal from './BasicAuthSignInModal.client.vue';
import BasicAuthRegisterModal from './BasicAuthRegisterModal.client.vue';
import BasicAuthUserMenu from './BasicAuthUserMenu.client.vue';
import BasicAuthChangePasswordModal from './BasicAuthChangePasswordModal.client.vue';

const props = defineProps<{
  /** Explicit host layout — preferred over inject (cross-package inject can miss). */
  layout?: AuthUiLayout;
}>();

const runtimeConfig = useRuntimeConfig();
const signInModalOpen = ref(false);
const registerModalOpen = ref(false);
const changePasswordModalOpen = ref(false);

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
    cache: 'no-store',
  });
}

async function refreshSession(
  options: { allowSilentRefresh?: boolean } = {}
): Promise<void> {
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

  const didRefresh = await silentRefreshOnce();
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
  () =>
    session.value?.authenticated === true &&
    session.value.provider === BASIC_AUTH_PROVIDER_ID
);
const sessionUser = computed(() => session.value?.user);

const injectedLayout = inject<AuthUiLayout | null>(AUTH_UI_LAYOUT_KEY, null);
const resolvedLayout = computed<AuthUiLayout>(() => {
  if (props.layout === 'more-sheet' || props.layout === 'rail') {
    return props.layout;
  }
  return (injectedLayout ? unref(injectedLayout) : 'rail') as AuthUiLayout;
});
const isMoreSheetLayout = computed(
  () => resolvedLayout.value === 'more-sheet'
);

const loginButtonProps = {
  block: true,
  variant: 'ghost' as const,
  color: 'neutral' as const,
  class:
    'theme-btn h-[48px] w-[48px] p-0! flex flex-col items-center justify-center gap-1 py-1.5 bg-transparent border-[length:var(--md-border-width)] border-[color:var(--md-primary)]/30 rounded-[var(--md-border-radius)] text-[var(--md-primary)] hover:bg-[var(--md-primary)]/15 active:bg-[var(--md-primary)]/25 transition-colors duration-150 shadow-none',
  ui: {
    base: 'justify-center shadow-none',
  },
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
