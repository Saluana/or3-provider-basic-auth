import { beforeEach, describe, expect, it, vi } from 'vitest';

const registerAuthProviderMock = vi.hoisted(() => vi.fn());
const registerProviderTokenBrokerMock = vi.hoisted(() => vi.fn());
const hashPasswordMock = vi.hoisted(() => vi.fn(async () => 'hashed-bootstrap-password'));
const findAccountByEmailMock = vi.hoisted(() => vi.fn());
const ensureBootstrapAccountMock = vi.hoisted(() => vi.fn());

vi.mock('~~/server/auth/registry', () => ({
  registerAuthProvider: registerAuthProviderMock
}));

vi.mock('~~/server/auth/token-broker/registry', () => ({
  registerProviderTokenBroker: registerProviderTokenBrokerMock
}));

vi.mock('../../lib/password', () => ({
  hashPassword: hashPasswordMock
}));

vi.mock('../../lib/session-store', () => ({
  findAccountByEmail: findAccountByEmailMock,
  ensureBootstrapAccount: ensureBootstrapAccountMock
}));

describe('basic-auth register plugin', () => {
  beforeEach(() => {
    vi.resetModules();
    registerAuthProviderMock.mockReset();
    registerProviderTokenBrokerMock.mockReset();
    hashPasswordMock.mockReset();
    findAccountByEmailMock.mockReset();
    ensureBootstrapAccountMock.mockReset();
    findAccountByEmailMock.mockReturnValue(null);

    process.env.OR3_BASIC_AUTH_JWT_SECRET = 'jwt-secret';
    process.env.OR3_BASIC_AUTH_REFRESH_SECRET = 'refresh-secret';
    process.env.OR3_BASIC_AUTH_DB_PATH = ':memory:';
    delete process.env.OR3_BASIC_AUTH_BOOTSTRAP_EMAIL;
    delete process.env.OR3_BASIC_AUTH_BOOTSTRAP_PASSWORD;

    (globalThis as typeof globalThis & { defineNitroPlugin?: unknown }).defineNitroPlugin =
      (plugin: () => unknown) => plugin();

    (globalThis as typeof globalThis & { useRuntimeConfig?: unknown }).useRuntimeConfig = () => ({
      auth: {
        enabled: true,
        provider: 'basic-auth'
      }
    });
  });

  it('registers auth provider and token broker', async () => {
    await import('../register');

    expect(registerAuthProviderMock).toHaveBeenCalledTimes(1);
    expect(registerAuthProviderMock.mock.calls[0]?.[0]?.id).toBe('basic-auth');
    expect(registerProviderTokenBrokerMock).toHaveBeenCalledWith(
      'basic-auth',
      expect.any(Function)
    );
  });

  it('skips registration when required secret is missing in non-strict mode', async () => {
    delete process.env.OR3_BASIC_AUTH_JWT_SECRET;

    await import('../register');

    expect(registerAuthProviderMock).not.toHaveBeenCalled();
    expect(registerProviderTokenBrokerMock).not.toHaveBeenCalled();
  });

  it('does not hash bootstrap password when bootstrap account already exists', async () => {
    process.env.OR3_BASIC_AUTH_BOOTSTRAP_EMAIL = 'admin@example.com';
    process.env.OR3_BASIC_AUTH_BOOTSTRAP_PASSWORD = 'bootstrap-password';
    findAccountByEmailMock.mockReturnValue({
      id: 'account-1'
    });

    await import('../register');

    expect(hashPasswordMock).not.toHaveBeenCalled();
    expect(ensureBootstrapAccountMock).not.toHaveBeenCalled();
  });
});
