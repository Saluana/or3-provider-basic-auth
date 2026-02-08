import { beforeEach, describe, expect, it, vi } from 'vitest';

const registerAuthProviderMock = vi.hoisted(() => vi.fn());
const registerProviderTokenBrokerMock = vi.hoisted(() => vi.fn());

vi.mock('~~/server/auth/registry', () => ({
  registerAuthProvider: registerAuthProviderMock
}));

vi.mock('~~/server/auth/token-broker/registry', () => ({
  registerProviderTokenBroker: registerProviderTokenBrokerMock
}));

describe('basic-auth register plugin', () => {
  beforeEach(() => {
    vi.resetModules();
    registerAuthProviderMock.mockReset();
    registerProviderTokenBrokerMock.mockReset();

    process.env.OR3_BASIC_AUTH_JWT_SECRET = 'jwt-secret';
    process.env.OR3_BASIC_AUTH_REFRESH_SECRET = 'refresh-secret';
    process.env.OR3_BASIC_AUTH_DB_PATH = ':memory:';

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
});
