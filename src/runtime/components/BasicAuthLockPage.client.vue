<template>
  <div class="lock-page-auth">
    <slot v-if="$slots['email-form'] && !inviteToken" name="email-form" :state="state" />
    <UForm v-else :state="state" @submit="continueWithEmail">
      <UFormField label="Email address" name="email" :ui="{ label: 'lock-page-email-label', container: 'lock-page-email-container' }">
        <UInput
          v-model="state.email"
          type="email"
          name="email"
          placeholder="you@example.com"
          icon="i-lucide-mail"
          autocomplete="email"
          required
          class="w-full"
          style="padding-inline-start: var(--lock-email-inset, 1rem) !important; outline: var(--lock-email-focus, none) !important; outline-offset: 2px"
          :ui="{ base: 'lock-page-email-input', leading: 'lock-page-email-leading', leadingIcon: 'size-5' }"
        />
      </UFormField>
      <UButton
        block
        type="submit"
        size="xl"
        color="neutral"
        trailing-icon="i-lucide-arrow-right"
        class="lock-page-continue"
        :ui="{ label: 'tracking-normal', trailingIcon: 'size-5 ms-0' }"
      >
        Continue with email
      </UButton>
    </UForm>

    <div class="lock-page-divider" aria-hidden="true"><span>OR</span></div>

    <p class="lock-page-existing">
      Existing account?
      <button type="button" class="lock-page-sign-in" @click="signInModalOpen = true">Sign in</button>
    </p>

    <BasicAuthSignInModal
      v-model="signInModalOpen"
      :initial-email="state.email"
      :invite-token="inviteToken"
      @signed-in="handleSignedIn"
      @open-register="openRegisterFromSignIn"
    />

    <BasicAuthRegisterModal
      v-model="registerModalOpen"
      :initial-email="state.email"
      :invite-token="inviteToken"
      @open-sign-in="openSignInFromRegister"
      @registered="handleRegistered"
    />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue';
import { useRuntimeConfig } from '#imports';
import BasicAuthRegisterModal from './BasicAuthRegisterModal.client.vue';
import BasicAuthSignInModal from './BasicAuthSignInModal.client.vue';
import { claimInviteLinkAutoOpen, readInviteLinkToken } from '../lib/invite-link.client';

const runtimeConfig = useRuntimeConfig();
const state = reactive({ email: '' });
const signInModalOpen = ref(false);
const registerModalOpen = ref(false);
const inviteToken = ref<string | null>(null);

// The lock page only shows signed-out visitors; an invite link opens
// registration with its token filled in.
onMounted(() => {
  inviteToken.value = readInviteLinkToken();
  if (claimInviteLinkAutoOpen()) registerModalOpen.value = true;
});

function continueWithEmail(): void {
  state.email = state.email.trim();
  if (runtimeConfig.public?.registrationMode === 'disabled') {
    signInModalOpen.value = true;
  } else {
    registerModalOpen.value = true;
  }
}

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
async function openSignInFromRegister(token: string): Promise<void> {
  inviteToken.value = token || inviteToken.value;
  registerModalOpen.value = false;
  await nextTick();
  signInModalOpen.value = true;
}
</script>

<style scoped>
.lock-page-divider,
.lock-page-auth :deep(.lock-page-email-leading) {
  display: none;
}

.lock-page-auth :deep(.lock-page-email-label) {
  padding-inline: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--md-on-surface);
}

.lock-page-auth :deep(.lock-page-email-container) {
  margin-top: 0.375rem;
}

.lock-page-auth :deep(.lock-page-email-input) {
  height: 3rem;
  padding-inline: 1rem;
  border: 1px solid var(--md-outline-variant, var(--md-border-color));
  border-radius: var(--md-border-radius);
  background: var(--md-surface);
  font-size: 1rem;
  box-shadow: none;
}

.lock-page-auth :deep(.lock-page-email-input:focus-visible) {
  --lock-email-focus: 2px solid var(--md-primary);
}

.lock-page-auth :deep(.lock-page-continue) {
  margin-top: 0.875rem;
  min-height: 3.25rem;
  gap: 0.75rem;
  border-radius: var(--md-border-radius);
  background: var(--md-on-surface);
  color: var(--md-surface);
  font-size: 1rem;
  font-weight: 500;
  box-shadow: none;
}

.lock-page-auth :deep(.lock-page-continue:hover) {
  background: color-mix(in srgb, var(--md-on-surface) 90%, var(--md-surface));
}

.lock-page-existing {
  margin-top: 0.75rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--md-on-surface-variant);
}

/* A plain inline button: the theme's UButton padding would split it from the question. */
.lock-page-sign-in {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding-inline: 0.125rem;
  border-radius: 0.25rem;
  font: inherit;
  font-weight: 500;
  color: var(--md-on-surface);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-decoration-color: color-mix(in srgb, currentColor 45%, transparent);
  text-underline-offset: 4px;
  cursor: pointer;
  transition: text-decoration-color 150ms ease;
}

.lock-page-sign-in:hover {
  text-decoration-color: currentColor;
}

.lock-page-sign-in:focus-visible {
  outline: 2px solid var(--md-primary);
  outline-offset: 2px;
}

@media (width < 80rem) {
  .lock-page-auth {
    --lock-email-inset: 3rem;
  }

  .lock-page-auth :deep(.lock-page-email-label) {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .lock-page-auth :deep(.lock-page-email-leading) {
    display: flex;
    padding-inline-start: 1rem;
    color: #8492a3;
  }

  .lock-page-auth :deep(.lock-page-email-container) {
    margin-top: 0 !important;
  }

  .lock-page-auth :deep(.lock-page-email-input) {
    height: clamp(2.75rem, 6.2svh, 3.125rem);
    padding-inline-start: 3rem;
    border: 1px solid color-mix(in srgb, var(--lock-muted, #667385) 22%, transparent);
    border-radius: 0.875rem;
    background: color-mix(in srgb, var(--lock-card, #fff) 80%, transparent);
    color: var(--lock-ink, #0c1420);
    font-size: 1rem;
  }

  .lock-page-auth :deep(.lock-page-email-input::placeholder) {
    color: #8592a3;
  }

  .lock-page-auth :deep(.lock-page-continue) {
    min-height: clamp(2.75rem, 6.5svh, 3.25rem);
    margin-top: 0.625rem;
    border-radius: 1rem;
    background: #0d1115;
    color: #fff;
    box-shadow: 0 8px 14px -8px rgb(31 56 74 / 40%);
    font-size: 1rem;
    font-weight: 600;
  }

  .lock-page-auth :deep(.lock-page-continue:hover) {
    background: #242e38;
  }

  /* A dark slab disappears on the dark card, so the call to action turns light. */
  .dark .lock-page-auth :deep(.lock-page-continue) {
    background: #eef3f6;
    color: #0d1115;
    box-shadow: none;
  }

  .dark .lock-page-auth :deep(.lock-page-continue:hover) {
    background: #ffffff;
  }

  .lock-page-divider {
    display: flex;
    align-items: center;
    gap: 0.8125rem;
    margin-top: clamp(1rem, 3svh, 1.5rem);
    color: var(--lock-muted, #667385);
    font-size: 0.6875rem;
    line-height: 0.9375rem;
    letter-spacing: 0.08em;
  }

  .lock-page-divider::before,
  .lock-page-divider::after {
    height: 1px;
    flex: 1;
    background: color-mix(in srgb, var(--lock-muted, #667385) 24%, transparent);
    content: '';
  }

  .lock-page-existing {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: var(--lock-muted, #667385);
  }

  .lock-page-sign-in {
    font-weight: 600;
    color: var(--lock-ink, #0c1420);
  }
}

@media (width < 35rem) and (height <= 38.75rem) {
  .lock-page-divider {
    margin-top: 0.625rem;
  }

  .lock-page-existing {
    margin-top: 0;
  }
}

@media (width >= 35rem) and (width < 80rem) and (height <= 31.25rem) {
  .lock-page-divider {
    margin-top: 0.625rem;
  }

  .lock-page-existing {
    margin-top: 0;
  }
}
</style>
