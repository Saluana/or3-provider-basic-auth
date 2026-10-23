<template>
  <UModal
    v-model:open="isOpen"
    title="Welcome back"
    description="Pick up where you left off."
    :ui="modalUi"
  >
    <template #close>
      <UButton
        icon="i-lucide-x"
        aria-label="Close"
        color="neutral"
        variant="ghost"
        class="basic-auth-sign-in-close"
        :ui="{ base: 'p-0! max-md:p-0!' }"
      />
    </template>
    <template #title>
      <img :src="logoUrl" alt="" aria-hidden="true" class="basic-auth-sign-in-logo" />
      <span class="basic-auth-sign-in-heading">Welcome back</span>
    </template>
    <template #actions>
      <span aria-hidden="true" class="basic-auth-sign-in-hero" />
    </template>
    <template #body>
      <UForm :state="state" class="basic-auth-sign-in-form" @submit.prevent="onSubmit">
        <div class="basic-auth-sign-in-fields">
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

          <UFormField label="Password" name="password">
            <UInput
              v-model="state.password"
              type="password"
              icon="i-lucide-lock-keyhole"
              placeholder="••••••••"
              autocomplete="current-password"
              required
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

          <div class="basic-auth-sign-in-footer">
            <p class="basic-auth-sign-in-register">
              Don’t have an account?
              <button type="button" :disabled="pending" @click="emit('open-register')">Create account</button>
            </p>
            <div class="basic-auth-sign-in-actions">
              <UButton
                color="neutral"
                variant="outline"
                type="button"
                class="basic-auth-sign-in-cancel"
                :disabled="pending"
                @click="close"
              >
                Cancel
              </UButton>
              <UButton
                type="submit"
                color="neutral"
                class="basic-auth-sign-in-submit"
                trailing-icon="i-lucide-arrow-right"
                :loading="pending"
                :ui="{ label: 'tracking-normal', trailingIcon: 'size-5' }"
              >
                Sign in
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

const modalUi = {
  overlay: 'basic-auth-modal-overlay basic-auth-sign-in-overlay',
  content: 'basic-auth-modal-content basic-auth-sign-in-content',
  header: 'basic-auth-sign-in-header',
  wrapper: 'basic-auth-sign-in-intro',
  title: 'basic-auth-sign-in-title',
  description: 'basic-auth-sign-in-description',
  body: 'basic-auth-sign-in-body',
};

const runtimeConfig = useRuntimeConfig();
const logoUrl = computed(() => runtimeConfig.public?.branding?.logoUrl || '/logos/logo-svg.svg');

const props = defineProps<{
  modelValue: boolean;
  inviteToken?: string | null;
  initialEmail?: string;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
  (event: 'signed-in'): void;
  (event: 'open-register'): void;
}>();

const state = reactive({
  email: '',
  password: ''
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
        password: state.password,
        inviteToken: props.inviteToken?.trim() || undefined
      }
    });

    emit('signed-in');
    close();
  } catch (error) {
    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error
        ? Number((error as { statusCode?: number }).statusCode)
        : null;
    if (statusCode === 400) {
      errorMessage.value = 'Please enter a valid email and password.';
    } else if (statusCode === 401) {
      errorMessage.value = 'Invalid credentials';
    } else {
      errorMessage.value = 'Unable to sign in right now. Please try again.';
    }
  } finally {
    pending.value = false;
  }
}
</script>

<!-- Modal content is teleported outside the provider's root element. -->
<style>
.basic-auth-sign-in-overlay {
  z-index: 100 !important;
  background: color-mix(in srgb, var(--md-on-surface) 22%, transparent);
  backdrop-filter: blur(7px);
}

.basic-auth-sign-in-content {
  --sign-in-accent: #086db8;
  --sign-in-sky: #c6eaff;
  --sign-in-field-bg: var(--md-surface);
  --sign-in-field-border: var(--md-outline-variant, var(--md-border-color));
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
  background: radial-gradient(ellipse 65% 52% at 100% 0%, var(--sign-in-sky), transparent), var(--md-surface);
  color: var(--md-on-surface);
  box-shadow: 0 40px 100px -32px rgb(24 69 92 / 42%), 0 2px 6px rgb(24 69 92 / 6%);
}

.dark .basic-auth-sign-in-content {
  --sign-in-accent: #7cc0f5;
  --sign-in-sky: #233f63;
  --sign-in-field-bg: color-mix(in srgb, #10213a 30%, var(--md-surface));
  --sign-in-field-border: color-mix(in srgb, var(--md-on-surface) 18%, transparent);
  border-color: color-mix(in srgb, var(--md-on-surface) 12%, transparent);
  background: radial-gradient(ellipse 65% 52% at 100% 0%, var(--sign-in-sky), transparent),
    color-mix(in srgb, #10213a 40%, var(--md-surface));
  box-shadow: 0 40px 100px -32px rgb(0 0 0 / 70%);
}

.basic-auth-sign-in-content .basic-auth-sign-in-header {
  position: relative;
  display: block;
  flex-shrink: 0;
  min-height: 0;
  padding: 3rem 4rem 2.25rem;
  border: 0;
  background: transparent;
}

.basic-auth-sign-in-intro {
  position: relative;
  z-index: 1;
}

.basic-auth-sign-in-content .basic-auth-sign-in-title {
  color: var(--md-on-surface);
}

.basic-auth-sign-in-logo {
  display: block;
  width: auto;
  max-width: 13rem;
  height: 2.25rem;
  margin-bottom: 2.25rem;
  object-fit: contain;
  object-position: left;
}

.basic-auth-sign-in-heading {
  display: block;
  font-size: clamp(2rem, 5vw, 2.5rem);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.035em;
}

.basic-auth-sign-in-content .basic-auth-sign-in-description {
  display: block;
  margin-top: 0.5rem;
  color: var(--md-on-surface-variant);
  font-size: 1.125rem;
  line-height: 1.45;
}

.basic-auth-sign-in-hero {
  position: absolute;
  z-index: -1;
  top: 0.625rem;
  right: 0;
  width: 62%;
  aspect-ratio: 3 / 2;
  pointer-events: none;
  background: url('../assets/signin-hero-light.webp') top right / 100% auto no-repeat;
  /* Keep the seated bird and feet opaque; dissolve only the lower clouds. */
  mask-image: linear-gradient(#000 80%, rgb(0 0 0 / 40%) 89%, transparent 98%);
}

.dark .basic-auth-sign-in-hero {
  background-image: url('../assets/signin-hero-dark.webp');
}

.basic-auth-sign-in-content .basic-auth-sign-in-close {
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
  border: 1px solid color-mix(in srgb, var(--md-outline-variant, var(--md-border-color)) 30%, transparent);
  border-radius: 50%;
  background: color-mix(in srgb, var(--md-surface) 94%, transparent);
  color: var(--md-on-surface);
  box-shadow: 0 4px 14px rgb(24 69 92 / 10%);
}

.basic-auth-sign-in-content .basic-auth-sign-in-body {
  position: relative;
  flex: none;
  overflow: visible;
  padding: 0 4rem 2.75rem;
  border: 0;
  background: transparent;
}

.basic-auth-sign-in-body::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0;
  pointer-events: none;
  background: url('../assets/signup-clouds-bottom-light.webp') center bottom -3.5rem / 100% auto no-repeat;
}

.dark .basic-auth-sign-in-body::before {
  background-image: url('../assets/signup-clouds-bottom-dark.webp');
  opacity: 0.7;
}

.basic-auth-sign-in-fields {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.basic-auth-sign-in-form label {
  margin-bottom: 0.25rem;
  padding-inline: 0;
  color: var(--md-on-surface);
  font-size: 1rem;
  font-weight: 500;
}

.basic-auth-sign-in-form input:not([readonly]) {
  height: 3.125rem;
  border: 1px solid var(--sign-in-field-border);
  border-radius: 0.75rem;
  background: var(--sign-in-field-bg);
  color: var(--md-on-surface);
  font-size: 1rem;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.basic-auth-sign-in-form input:not([readonly]):hover {
  border-color: color-mix(in srgb, var(--md-on-surface) 32%, transparent);
}

.basic-auth-sign-in-form input:not([readonly]):focus {
  border-color: var(--sign-in-accent);
}

.basic-auth-sign-in-form input::placeholder {
  color: var(--md-on-surface-variant);
  opacity: 0.75;
}

.basic-auth-sign-in-form [data-slot='leading'] {
  padding-inline-start: 1.125rem;
}

.basic-auth-sign-in-form [data-slot='leadingIcon'] {
  color: var(--md-on-surface-variant);
}

/* Earlier-layer important rules override the host's themed control padding. */
@layer components {
  .basic-auth-sign-in-form input:not([readonly]) {
    padding-inline: 3.25rem 1rem !important;
  }

  .basic-auth-sign-in-form input:not([readonly]):focus-visible {
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--sign-in-accent) 18%, transparent) !important;
  }

  .basic-auth-sign-in-content .basic-auth-sign-in-actions > button {
    padding-inline: 1.375rem !important;
  }
}

.basic-auth-sign-in-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding-top: 1.5rem;
}

.basic-auth-sign-in-register {
  margin: 0;
  color: var(--md-on-surface-variant);
  font-size: 1rem;
}

.basic-auth-sign-in-register button {
  min-height: 2.75rem;
  margin-inline-start: 0.25rem;
  color: var(--sign-in-accent);
  text-decoration: underline;
  font-weight: 500;
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
  cursor: pointer;
}

.basic-auth-sign-in-actions {
  display: flex;
  gap: 0.75rem;
  margin-left: auto;
}

.basic-auth-sign-in-content .basic-auth-sign-in-actions > button {
  justify-content: center;
  height: 3.125rem;
  min-height: 3.125rem;
  border-radius: 0.75rem;
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: normal;
}

.basic-auth-sign-in-content .basic-auth-sign-in-cancel {
  background: var(--sign-in-field-bg);
  color: var(--md-on-surface);
  border: 1px solid var(--sign-in-field-border);
  box-shadow: none;
}

.basic-auth-sign-in-content .basic-auth-sign-in-submit {
  gap: 0.75rem;
  background: var(--md-on-surface);
  color: var(--md-surface);
  border: 1px solid transparent;
  box-shadow: 0 7px 18px -6px rgb(0 0 0 / 35%);
}

.basic-auth-sign-in-content .basic-auth-sign-in-actions > button:hover {
  filter: brightness(0.92);
}

.basic-auth-sign-in-content button:focus-visible {
  outline: 2px solid var(--sign-in-accent);
  outline-offset: 3px;
}

.basic-auth-sign-in-content button:disabled {
  opacity: 0.6;
  cursor: default;
}

/* Keep the control scale aligned with registration on laptop-height screens. */
@media (width >= 640px) and (height < 58rem) {
  .basic-auth-sign-in-content .basic-auth-sign-in-header {
    padding-top: 2.25rem;
    padding-bottom: 1.5rem;
  }

  .basic-auth-sign-in-logo {
    height: 2rem;
    margin-bottom: 1.5rem;
  }

  .basic-auth-sign-in-heading {
    font-size: 2.25rem;
  }

  .basic-auth-sign-in-hero {
    width: 56%;
    top: 0;
  }

  .basic-auth-sign-in-content .basic-auth-sign-in-body {
    padding-bottom: 2rem;
  }

  .basic-auth-sign-in-fields {
    gap: 1rem;
  }

  .basic-auth-sign-in-form input:not([readonly]),
  .basic-auth-sign-in-content .basic-auth-sign-in-actions > button {
    height: 2.875rem;
    min-height: 2.875rem;
  }

  .basic-auth-sign-in-footer {
    padding-top: 1rem;
  }
}

@media (width < 640px) {
  .basic-auth-sign-in-content {
    width: calc(100vw - 1rem);
    max-height: calc(100dvh - 1rem);
    border-radius: 1.25rem;
  }

  .basic-auth-sign-in-content .basic-auth-sign-in-header {
    padding: 1.75rem 1.5rem 1.5rem;
  }

  .basic-auth-sign-in-logo {
    height: 1.75rem;
    max-width: 10rem;
    margin-bottom: 6.25rem;
  }

  .basic-auth-sign-in-heading {
    font-size: 1.875rem;
  }

  .basic-auth-sign-in-content .basic-auth-sign-in-description {
    font-size: 1rem;
  }

  .basic-auth-sign-in-hero {
    width: 15rem;
    top: 0.75rem;
  }

  .basic-auth-sign-in-content .basic-auth-sign-in-close {
    top: 0.75rem;
    inset-inline-end: 0.75rem;
  }

  .basic-auth-sign-in-content .basic-auth-sign-in-body {
    padding: 0 1.5rem 1.75rem;
  }

  .basic-auth-sign-in-body::before {
    background-position: center bottom;
  }

  .basic-auth-sign-in-fields {
    gap: 1rem;
  }

  .basic-auth-sign-in-form input:not([readonly]),
  .basic-auth-sign-in-content .basic-auth-sign-in-actions > button {
    height: 3rem;
    min-height: 3rem;
  }

  .basic-auth-sign-in-footer {
    gap: 0.5rem;
    padding-top: 0.25rem;
  }

  .basic-auth-sign-in-actions {
    width: 100%;
  }

  .basic-auth-sign-in-submit {
    flex: 1;
  }
}
</style>
