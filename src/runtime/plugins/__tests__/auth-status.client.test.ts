import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { registerStatus, registerRecovery } = vi.hoisted(() => ({
  registerStatus: vi.fn(),
  registerRecovery: vi.fn()
}));

vi.mock('../../../test-shims/client-auth-registries', () => ({
  registerClientAuthStatusResolver: registerStatus,
  registerClientSessionRecovery: registerRecovery
}));

describe('basic auth client adapters', () => {
  beforeEach(() => {
    vi.resetModules();
    registerStatus.mockClear();
    registerRecovery.mockClear();
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each([
    { ssrAuthEnabled: false, authProvider: 'basic-auth' },
    { ssrAuthEnabled: true, authProvider: 'clerk' }
  ])('preserves active provider adapters when inactive for %j', async (publicConfig) => {
    vi.stubGlobal('useRuntimeConfig', () => ({ public: publicConfig }));
    const { default: setup } = await import('../auth-status.client');
    setup();

    expect(registerStatus).not.toHaveBeenCalled();
    expect(registerRecovery).not.toHaveBeenCalled();
  });

  it('recovers a Basic auth session and reports its authenticated status when selected', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: { ssrAuthEnabled: true, authProvider: 'basic-auth' }
    }));
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ session: { authenticated: true, provider: 'basic-auth' } });
    vi.stubGlobal('$fetch', fetch);
    const { default: setup } = await import('../auth-status.client');
    setup();

    await expect(registerRecovery.mock.calls[0][0]()).resolves.toBe(true);
    await expect(registerStatus.mock.calls[0][0]()).resolves.toEqual({ ready: true, authenticated: true });
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/api/basic-auth/refresh?silent=1', '/api/auth/session'
    ]);
  });
});
