import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { resetBasicAuthDbForTests } from '../../db/client';
import { findAccountByEmail } from '../../lib/session-store';
import register from '../register';

const registerAuthProviderMock = vi.hoisted(() => vi.fn());
const registerProviderTokenBrokerMock = vi.hoisted(() => vi.fn());

vi.mock('nitropack/runtime/plugin', () => ({
  defineNitroPlugin: (plugin: () => unknown) => plugin
}));

vi.mock('~~/server/auth/registry', () => ({
  registerAuthProvider: registerAuthProviderMock
}));

vi.mock('~~/server/auth/token-broker/registry', () => ({
  registerProviderTokenBroker: registerProviderTokenBrokerMock
}));

// Nitro 2 calls startup plugins without awaiting returned promises. Exercise
// that boundary with the real account store and password implementation.
const start = register as unknown as () => unknown;

describe('basic-auth register plugin', () => {
  beforeEach(() => {
    registerAuthProviderMock.mockReset();
    registerProviderTokenBrokerMock.mockReset();
    resetBasicAuthDbForTests();
    vi.stubEnv('OR3_BASIC_AUTH_JWT_SECRET', 'jwt-secret');
    vi.stubEnv('OR3_BASIC_AUTH_REFRESH_SECRET', 'refresh-secret');
    vi.stubEnv('OR3_BASIC_AUTH_DB_PATH', ':memory:');
    vi.stubEnv('OR3_BASIC_AUTH_BOOTSTRAP_EMAIL', '');
    vi.stubEnv('OR3_BASIC_AUTH_BOOTSTRAP_PASSWORD', '');
    vi.stubEnv('OR3_BASIC_AUTH_ALLOW_INSECURE_DEV', '');
    vi.stubGlobal('useRuntimeConfig', () => ({
      auth: { enabled: true, provider: 'basic-auth' }
    }));
  });

  afterEach(() => {
    resetBasicAuthDbForTests();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('fails startup synchronously when a required secret is missing', () => {
    vi.stubEnv('OR3_BASIC_AUTH_JWT_SECRET', '');
    expect(() => {
      // Consume a rejected async return in the negative control: Nitro itself
      // does not await it, so it must not count as a synchronous startup failure.
      const result = start();
      if (result instanceof Promise) void result.catch(() => undefined);
    }).toThrow('Missing OR3_BASIC_AUTH_JWT_SECRET.');
    expect(registerAuthProviderMock).not.toHaveBeenCalled();
    expect(registerProviderTokenBrokerMock).not.toHaveBeenCalled();
  });

  it('allows the explicit development escape hatch without registering auth', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('OR3_BASIC_AUTH_JWT_SECRET', '');
    vi.stubEnv('OR3_BASIC_AUTH_ALLOW_INSECURE_DEV', 'true');
    start();
    expect(registerAuthProviderMock).not.toHaveBeenCalled();
    expect(registerProviderTokenBrokerMock).not.toHaveBeenCalled();
  });

  it('makes the bootstrap account usable before startup returns and preserves it on restart', async () => {
    const email = 'admin@example.com';
    const password = 'bootstrap-password';
    vi.stubEnv('OR3_BASIC_AUTH_BOOTSTRAP_EMAIL', email);
    vi.stubEnv('OR3_BASIC_AUTH_BOOTSTRAP_PASSWORD', password);
    const pending = start();
    try {
      const account = findAccountByEmail(email);
      expect(account).not.toBeNull();
      expect(bcrypt.compareSync(password, account!.password_hash)).toBe(true);
      vi.stubEnv('OR3_BASIC_AUTH_BOOTSTRAP_PASSWORD', 'changed-bootstrap-password');
      start();
      expect(findAccountByEmail(email)?.password_hash).toBe(account!.password_hash);
    } finally {
      // Let the old implementation finish before closing its database when
      // proving this regression fails against the unfixed source.
      await pending;
    }
  });
});
