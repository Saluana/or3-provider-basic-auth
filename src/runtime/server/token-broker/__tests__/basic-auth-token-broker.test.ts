import { describe, expect, it } from 'vitest';
import type { H3Event } from 'h3';
import { BasicAuthTokenBroker } from '../basic-auth-token-broker';

describe('BasicAuthTokenBroker', () => {
  it('returns null explicitly for provider tokens', async () => {
    const broker = new BasicAuthTokenBroker();
    const token = await broker.getProviderToken({} as unknown as H3Event, {
      providerId: 'convex',
      template: 'convex-sync'
    });

    expect(token).toBeNull();
  });
});
