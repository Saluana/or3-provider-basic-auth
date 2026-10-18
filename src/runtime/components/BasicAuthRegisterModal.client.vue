<template>
  <UModal
    v-model:open="isOpen"
    title="Create your account"
    description="Get started in under a minute."
    :ui="modalUi"
  >
    <template #close>
      <UButton
        icon="i-lucide-x"
        aria-label="Close"
        color="neutral"
        variant="ghost"
        class="basic-auth-register-close"
        :ui="{ base: 'p-0! max-md:p-0!' }"
      />
    </template>
    <template #title>
      <img :src="logoUrl" alt="" aria-hidden="true" class="basic-auth-register-logo" />
      <span class="basic-auth-register-heading">Create your account</span>
    </template>
    <template #actions>
      <span aria-hidden="true" class="basic-auth-register-hero" />
    </template>
    <template #body>
      <UForm :state="state" class="basic-auth-register-form" @submit.prevent="onSubmit">
        <div class="basic-auth-register-fields">
          <input
            :value="state.email"
            type="text"
            autocomplete="username"
            tabindex="-1"
            aria-hidden="true"
            class="sr-only pointer-events-none h-0 w-0 opacity-0"
            readonly
          />

          <UFormField label="Email" name="email">
            <UInput
              v-model="state.email"
              type="email"
              icon="i-lucide-mail"
              placeholder="you@example.com"
              autocomplete="username"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField label="Display name" name="displayName">
            <UInput
              v-model="state.displayName"
              type="text"
              icon="i-lucide-user-round"
              placeholder="Your name"
              autocomplete="name"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Password"
            name="password"
            hint="Use at least 8 characters"
          >
            <UInput
              v-model="state.password"
              type="password"
              icon="i-lucide-lock-keyhole"
              placeholder="••••••••"
              autocomplete="new-password"
              minlength="8"
              maxlength="512"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField label="Confirm password" name="confirmPassword">
            <UInput
              v-model="state.confirmPassword"
              type="password"
              icon="i-lucide-lock-keyhole"
              placeholder="••••••••"
              autocomplete="new-password"
              minlength="8"
              maxlength="512"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="props.inviteToken ? 'Invite code (from your invite link)' : 'Invite code (optional)'"
            name="inviteToken"
          >
            <UInput
              v-model="state.inviteToken"
              type="text"
              icon="i-lucide-ticket"
              placeholder="Paste invite code"
              class="w-full"
            />
          </UFormField>

          <div
            v-if="errorMessage"
            role="alert"
            class="flex items-start gap-2 rounded-[var(--md-border-radius)] border border-[var(--md-error)]/30 bg-[var(--md-error)]/8 px-3 py-2.5 text-sm text-[var(--md-error)]"
          >
            <UIcon name="i-lucide-alert-circle" class="w-4 h-4 mt-0.5 shrink-0" />
            {{ errorMessage }}
          </div>

          <div class="basic-auth-register-footer">
            <p class="basic-auth-register-existing">
              Already registered?
              <button
                type="button"
                :disabled="pending"
                @click="emit('open-sign-in', state.inviteToken)"
              >Sign in</button>
            </p>
            <div class="basic-auth-register-actions">
              <UButton
                color="neutral"
                variant="outline"
                type="button"
                class="basic-auth-register-cancel"
                :disabled="pending"
                @click="close"
              >
                Cancel
              </UButton>
              <UButton
                color="neutral"
                class="basic-auth-register-submit"
                type="submit"
                trailing-icon="i-lucide-arrow-right"
                :loading="pending"
                :ui="{ label: 'tracking-normal', trailingIcon: 'size-5' }"
              >
                Create account
              </UButton>
            </div>
          </div>
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRuntimeConfig } from '#imports';
import { newPasswordFitsBcrypt } from '../password-policy';

const modalUi = {
  overlay: 'basic-auth-modal-overlay basic-auth-register-overlay',
  content: 'basic-auth-modal-content basic-auth-register-content',
  header: 'basic-auth-register-header',
  wrapper: 'basic-auth-register-intro',
  title: 'basic-auth-register-title',
  description: 'basic-auth-register-description',
  body: 'basic-auth-register-body',
};

const runtimeConfig = useRuntimeConfig();
const logoUrl = computed(() => runtimeConfig.public?.branding?.logoUrl || '/logos/logo-svg.svg');

const props = defineProps<{
  modelValue: boolean;
  /** Token from an invite link; filled in when the form opens. */
  inviteToken?: string | null;
  initialEmail?: string;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
  (event: 'registered'): void;
  (event: 'open-sign-in', inviteToken: string): void;
}>();

const state = reactive({
  email: '',
  displayName: '',
  password: '',
  confirmPassword: '',
  inviteToken: ''
});
const pending = ref(false);
const errorMessage = ref('');

watch(() => props.modelValue, (open) => {
  if (open && props.initialEmail) state.email = props.initialEmail.trim();
}, { immediate: true });

const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => {
    emit('update:modelValue', value);
  }
});

// Fill in a link's token when the form opens without replacing one the user typed.
watch(() => [props.modelValue, props.inviteToken] as const, ([open, token]) => {
  if (open && token && !state.inviteToken.trim()) state.inviteToken = token;
}, { immediate: true });

function close(): void {
  errorMessage.value = '';
  emit('update:modelValue', false);
}

function validateClientSide(): string | null {
  const email = state.email.trim();
  if (!email || !email.includes('@')) {
    return 'Enter a valid email address.';
  }
  if (state.password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (state.password.length > 512) {
    return 'Password is too long. Please shorten it.';
  }
  if (!newPasswordFitsBcrypt(state.password)) {
    return 'Password is too long. Please shorten it.';
  }
  if (state.password !== state.confirmPassword) {
    return 'Passwords must match.';
  }
  return null;
}

function readFetchErrorMessage(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const data = (error as { data?: { statusMessage?: string; message?: string } }).data;
  return data?.statusMessage || data?.message || null;
}

async function onSubmit(): Promise<void> {
  pending.value = true;
  errorMessage.value = '';

  const clientError = validateClientSide();
  if (clientError) {
    errorMessage.value = clientError;
    pending.value = false;
    return;
  }

  try {
    await $fetch('/api/basic-auth/register', {
      method: 'POST',
      body: {
        email: state.email,
        displayName: state.displayName || undefined,
        password: state.password,
        confirmPassword: state.confirmPassword,
        inviteToken: state.inviteToken || undefined,
      }
    });

    emit('registered');
    close();
  } catch (error) {
    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error
        ? Number((error as { statusCode?: number }).statusCode)
        : null;
    const serverMessage = readFetchErrorMessage(error);

    if (statusCode === 400) {
      errorMessage.value =
        serverMessage || 'Please check your email and password, then try again.';
    } else if (statusCode === 403) {
      errorMessage.value =
        serverMessage || 'Registration is restricted for this instance.';
    } else if (statusCode === 401) {
      errorMessage.value = 'Unable to register. If you already registered, sign in to continue.';
    } else if (statusCode === 409) {
      errorMessage.value = 'Email is already in use.';
    } else {
      errorMessage.value =
        serverMessage || 'Unable to register right now. Please try again.';
    }
  } finally {
    pending.value = false;
  }
}
</script>

<!-- Modal content is teleported outside the provider's root element. -->
<style>
.basic-auth-register-overlay {
  z-index: 100 !important;
  background: color-mix(in srgb, var(--md-on-surface) 22%, transparent);
  backdrop-filter: blur(7px);
}

/* The artwork is sky blue in every theme, so its accents are fixed too. */
.basic-auth-register-content {
  --register-sky: #d5eafb;
  --register-accent: #086db8;
  --register-field-bg: var(--md-surface);
  --register-field-border: var(--md-outline-variant, var(--md-border-color));
  isolation: isolate;
  z-index: 100 !important;
  width: calc(100vw - 2rem);
  max-width: 44rem;
  max-height: calc(100dvh - 2rem);
  gap: 0;
  overflow-x: hidden;
  overflow-y: auto;
  border: 1px solid color-mix(in srgb, var(--md-outline-variant, var(--md-border-color)) 45%, transparent);
  border-radius: 1.75rem;
  /* A little sky behind the white cloud tops keeps their edges visible. */
  background: radial-gradient(ellipse 60% 36% at 100% 0%, var(--register-sky), transparent),
    var(--md-surface);
  color: var(--md-on-surface);
  box-shadow: 0 40px 100px -32px rgb(24 69 92 / 42%), 0 2px 6px rgb(24 69 92 / 6%);
}

.dark .basic-auth-register-content {
  --register-sky: #1b3352;
  --register-accent: #7cc0f5;
  --register-field-bg: color-mix(in srgb, #10213a 30%, var(--md-surface));
  --register-field-border: color-mix(in srgb, var(--md-on-surface) 16%, transparent);
  border-color: color-mix(in srgb, var(--md-on-surface) 10%, transparent);
  background: radial-gradient(ellipse 60% 36% at 100% 0%, var(--register-sky), transparent),
    linear-gradient(180deg,
      color-mix(in srgb, #10213a 50%, var(--md-surface)),
      color-mix(in srgb, #10213a 22%, var(--md-surface)) 55%,
      color-mix(in srgb, #10213a 40%, var(--md-surface)));
  box-shadow: 0 40px 100px -32px rgb(0 0 0 / 70%), inset 0 1px 0 rgb(255 255 255 / 6%);
}

.basic-auth-register-content .basic-auth-register-header {
  position: relative;
  display: block;
  flex-shrink: 0;
  min-height: 0;
  padding: 3rem 4rem 2.25rem;
  border: 0;
  background: transparent;
}

.basic-auth-register-intro {
  position: relative;
  z-index: 1;
}

.basic-auth-register-content .basic-auth-register-title {
  color: var(--md-on-surface);
}

.basic-auth-register-logo {
  display: block;
  width: auto;
  max-width: 13rem;
  height: 2.25rem;
  object-fit: contain;
  object-position: left;
  margin-bottom: 2.25rem;
}

.basic-auth-register-heading {
  display: block;
  font-size: clamp(2rem, 5vw, 2.5rem);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.035em;
}

.basic-auth-register-content .basic-auth-register-description {
  display: block;
  margin-top: 0.5rem;
  color: var(--md-on-surface-variant);
  font-size: 1.125rem;
  line-height: 1.45;
}

.basic-auth-register-hero {
  position: absolute;
  z-index: -1;
  top: 0.625rem;
  right: 0;
  width: min(22rem, 50%);
  aspect-ratio: 760 / 630;
  pointer-events: none;
  background: url('../assets/signup-hero-light.webp') top right / 100% auto no-repeat;
  /* The birds sit in the top 72% of both heroes; only the cloud below dissolves. */
  mask-image: linear-gradient(#000 73%, rgb(0 0 0 / 45%) 82%, rgb(0 0 0 / 12%) 90%, transparent 97%);
}

.dark .basic-auth-register-hero {
  background-image: url('../assets/signup-hero-dark.webp');
}

.basic-auth-register-content .basic-auth-register-close {
  position: absolute;
  z-index: 2;
  top: 1.5rem;
  inset-inline-end: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  min-height: 2.75rem;
  border: 1px solid color-mix(in srgb, var(--md-outline-variant, var(--md-border-color)) 35%, transparent);
  border-radius: 50%;
  background: color-mix(in srgb, var(--md-surface) 92%, transparent);
  color: var(--md-on-surface);
  box-shadow: 0 4px 14px rgb(24 69 92 / 12%);
}

.dark .basic-auth-register-content .basic-auth-register-close {
  border-color: color-mix(in srgb, var(--md-on-surface) 14%, transparent);
  background: color-mix(in srgb, var(--md-surface) 70%, transparent);
  box-shadow: 0 4px 14px rgb(0 0 0 / 35%);
}

.basic-auth-register-content .basic-auth-register-body {
  position: relative;
  flex: none;
  overflow: visible;
  padding: 0 4rem 2.75rem;
  border: 0;
}

/* A low cloud edge that keeps its shape at every card height. */
.basic-auth-register-content .basic-auth-register-body::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0;
  pointer-events: none;
  background: url('../assets/signup-clouds-bottom-light.webp') center bottom -4rem / 100% auto no-repeat;
}

.dark .basic-auth-register-content .basic-auth-register-body::before {
  background-image: url('../assets/signup-clouds-bottom-dark.webp');
}

.basic-auth-register-fields {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.basic-auth-register-form label {
  margin-bottom: 0.25rem;
  padding-inline: 0;
  color: var(--md-on-surface);
  font-size: 1rem;
  font-weight: 500;
}

.basic-auth-register-form input:not([readonly]) {
  height: 3.125rem;
  border: 1px solid var(--register-field-border);
  border-radius: 0.75rem;
  background: var(--register-field-bg);
  color: var(--md-on-surface);
  font-size: 1rem;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.basic-auth-register-form input:not([readonly]):hover {
  border-color: color-mix(in srgb, var(--md-on-surface) 32%, transparent);
}

.basic-auth-register-form input:not([readonly]):focus {
  border-color: var(--register-accent);
}

.basic-auth-register-form input::placeholder {
  color: color-mix(in srgb, var(--md-on-surface-variant) 78%, var(--md-surface));
  opacity: 1;
}

.basic-auth-register-form [data-slot='leading'] {
  padding-inline-start: 1.125rem;
}

.basic-auth-register-form [data-slot='leadingIcon'] {
  color: var(--md-on-surface-variant);
}

/*
 * Host themes pin control padding and focus rings with `!important`
 * utilities. Important rules in an earlier layer outrank them.
 */
@layer components {
  .basic-auth-register-form input:not([readonly]) {
    padding-inline: 3.25rem 1rem !important;
  }

  .basic-auth-register-form input:not([readonly]):focus-visible {
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--register-accent) 18%, transparent) !important;
  }

  .basic-auth-register-content .basic-auth-register-actions > button {
    padding-inline: 1.375rem !important;
  }
}

.basic-auth-register-footer {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding-top: 1.5rem;
}

/* A small spark from the artwork, in the left gutter. */
.basic-auth-register-footer::before {
  content: '';
  position: absolute;
  top: 0.375rem;
  left: -2.25rem;
  width: 1.375rem;
  height: 1.375rem;
  pointer-events: none;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2384c341' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M12.4 16.6 5.8 14.2M15 13.3 11 7.5M19 12V5'/%3E%3C/svg%3E") center / contain no-repeat;
}

.basic-auth-register-existing {
  margin: 0;
  color: var(--md-on-surface-variant);
  font-size: 1rem;
}

.dark .basic-auth-register-existing {
  text-shadow: 0 0 12px rgb(9 18 33 / 90%), 0 1px 2px rgb(9 18 33 / 80%);
}

.basic-auth-register-existing button {
  min-height: 2.75rem;
  color: var(--register-accent);
  font-weight: 500;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
  cursor: pointer;
}

.basic-auth-register-actions {
  display: flex;
  gap: 0.75rem;
  margin-left: auto;
}

.basic-auth-register-content .basic-auth-register-actions > button {
  justify-content: center;
  height: 3.125rem;
  min-height: 3.125rem;
  border-radius: 0.75rem;
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: normal;
}

.basic-auth-register-content .basic-auth-register-cancel {
  background: var(--register-field-bg);
  color: var(--md-on-surface);
  border: 1px solid var(--register-field-border);
  box-shadow: none;
}

.basic-auth-register-content .basic-auth-register-cancel:hover {
  background: color-mix(in srgb, var(--md-on-surface) 5%, var(--md-surface));
}

.basic-auth-register-content .basic-auth-register-submit {
  gap: 0.75rem;
  background: var(--md-on-surface);
  color: var(--md-surface);
  border: 1px solid transparent;
  box-shadow: 0 6px 16px -6px rgb(0 0 0 / 35%);
}

.basic-auth-register-content .basic-auth-register-submit:hover {
  background: color-mix(in srgb, var(--md-on-surface) 88%, var(--md-surface));
}

.basic-auth-register-content button:focus-visible {
  outline: 2px solid var(--register-accent);
  outline-offset: 3px;
}

.basic-auth-register-content button:disabled {
  opacity: 0.6;
  cursor: default;
}

/* Fit laptop-height viewports without scrolling the card. */
@media (width >= 640px) and (height < 58rem) {
  .basic-auth-register-content .basic-auth-register-header {
    padding-top: 2.25rem;
    padding-bottom: 1.5rem;
  }

  .basic-auth-register-logo {
    height: 2rem;
    margin-bottom: 1.5rem;
  }

  .basic-auth-register-heading {
    font-size: 2.25rem;
  }

  .basic-auth-register-content .basic-auth-register-body {
    padding-bottom: 2rem;
  }

  .basic-auth-register-fields {
    gap: 1rem;
  }

  .basic-auth-register-form input:not([readonly]),
  .basic-auth-register-content .basic-auth-register-actions > button {
    height: 2.875rem;
    min-height: 2.875rem;
  }

  .basic-auth-register-footer {
    padding-top: 1rem;
  }
}

@media (width < 640px) {
  .basic-auth-register-content {
    width: calc(100vw - 1rem);
    max-height: calc(100dvh - 1rem);
    border-radius: 1.25rem;
  }

  .basic-auth-register-content .basic-auth-register-header {
    padding: 1.75rem 1.5rem 1.5rem;
  }

  .basic-auth-register-logo {
    height: 1.75rem;
    max-width: 10rem;
    margin-bottom: 4.75rem;
  }

  .basic-auth-register-heading {
    font-size: 1.875rem;
  }

  .basic-auth-register-content .basic-auth-register-description {
    font-size: 1rem;
  }

  .basic-auth-register-hero {
    top: 0.75rem;
    width: 12.5rem;
  }

  .basic-auth-register-content .basic-auth-register-close {
    top: 0.75rem;
    inset-inline-end: 0.75rem;
  }

  .basic-auth-register-content .basic-auth-register-body {
    padding: 0 1.5rem 1.75rem;
  }

  .basic-auth-register-content .basic-auth-register-body::before {
    background-position: center bottom;
  }

  .basic-auth-register-fields {
    gap: 1rem;
  }

  .basic-auth-register-form input:not([readonly]),
  .basic-auth-register-content .basic-auth-register-actions > button {
    height: 3rem;
    min-height: 3rem;
  }

  .basic-auth-register-footer {
    gap: 0.5rem;
    padding-top: 0.25rem;
  }

  .basic-auth-register-footer::before {
    display: none;
  }

  .basic-auth-register-actions {
    width: 100%;
  }

  .basic-auth-register-submit {
    flex: 1;
  }
}
</style>
