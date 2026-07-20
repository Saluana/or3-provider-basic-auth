import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resetSilentRefreshForTests,
  silentRefreshOnce
} from '../../lib/silent-refresh.client';

describe('silentRefreshOnce', () => {
  beforeEach(() => {
    resetSilentRefreshForTests();
  });

  afterEach(() => {
    resetSilentRefreshForTests();
    vi.unstubAllGlobals();
  });

  it('deduplicates concurrent refresh calls into a single request', async () => {
    let resolveFetch: ((value: { ok: boolean }) => void) | null = null;
    const fetchMock = vi.fn(
      () =>
        new Promise<{ ok: boolean }>((resolve) => {
          resolveFetch = resolve;
        })
    );
    vi.stubGlobal('$fetch', fetchMock);

    const first = silentRefreshOnce();
    const second = silentRefreshOnce();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/basic-auth/refresh?silent=1', {
      method: 'POST'
    });

    resolveFetch?.({ ok: true });

    await expect(first).resolves.toBe(true);
    await expect(second).resolves.toBe(true);
  });

  it('allows a new request after the previous inflight settles', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false });
    vi.stubGlobal('$fetch', fetchMock);

    await expect(silentRefreshOnce()).resolves.toBe(true);
    await expect(silentRefreshOnce()).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
