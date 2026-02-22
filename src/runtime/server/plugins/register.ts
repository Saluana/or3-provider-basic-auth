import { BASIC_AUTH_PROVIDER_ID } from '../../lib/constants';
import { registerAuthProvider } from '~~/server/auth/registry';
import { registerProviderAdminAdapter } from '~~/server/admin/providers/registry';
import { registerProviderTokenBroker } from '~~/server/auth/token-broker/registry';
import { basicAuthProvider } from '../auth/basic-auth-provider';
import { createBasicAuthTokenBroker } from '../token-broker/basic-auth-token-broker';
import {
  BASIC_AUTH_INSECURE_DEV_ESCAPE_HATCH_ENV,
  getBasicAuthConfig,
  isBasicAuthInsecureDevEscapeHatchEnabled,
  validateBasicAuthConfig
} from '../lib/config';
import { hashPassword } from '../lib/password';
import { ensureBootstrapAccount, findAccountByEmail } from '../lib/session-store';
import { basicAuthAdminAdapter } from '../admin/adapters/auth-basic-auth';

async function ensureBootstrapUserIfConfigured(): Promise<void> {
  const config = getBasicAuthConfig();
  const email = config.bootstrapEmail?.trim();
  const password = config.bootstrapPassword;

  if (!email || !password) {
    return;
  }

  if (findAccountByEmail(email)) {
    return;
  }

  const passwordHash = await hashPassword(password);
  ensureBootstrapAccount({
    email,
    passwordHash,
    displayName: email
  });
}

export default defineNitroPlugin(async () => {
  const runtimeConfig = useRuntimeConfig();
  const diagnostics = validateBasicAuthConfig(runtimeConfig);

  for (const warning of diagnostics.warnings) {
    console.warn(`[basic-auth] ${warning}`);
  }

  if (!diagnostics.config.enabled) {
    return;
  }

  if (diagnostics.config.providerId !== BASIC_AUTH_PROVIDER_ID) {
    return;
  }

  if (!diagnostics.isValid) {
    const message = `${diagnostics.errors.join(' ')} Install/configure basic-auth provider env values and restart.`;
    if (isBasicAuthInsecureDevEscapeHatchEnabled() && !diagnostics.config.strict) {
      console.warn(
        `[basic-auth] ${message} Startup continues because ${BASIC_AUTH_INSECURE_DEV_ESCAPE_HATCH_ENV}=true (development only).`
      );
      return;
    }

    throw new Error(message);
  }

  await ensureBootstrapUserIfConfigured();
  registerAuthProvider({
    id: BASIC_AUTH_PROVIDER_ID,
    order: 100,
    create: () => basicAuthProvider
  });

  registerProviderTokenBroker(BASIC_AUTH_PROVIDER_ID, createBasicAuthTokenBroker);
  registerProviderAdminAdapter(basicAuthAdminAdapter);
});
