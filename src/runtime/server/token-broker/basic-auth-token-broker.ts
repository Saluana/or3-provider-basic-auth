import type { H3Event } from 'h3';
import type {
  ProviderTokenBroker,
  ProviderTokenRequest
} from '~~/server/auth/token-broker/types';

export class BasicAuthTokenBroker implements ProviderTokenBroker {
  async getProviderToken(
    _event: H3Event,
    _req: ProviderTokenRequest
  ): Promise<string | null> {
    return null;
  }
}

export function createBasicAuthTokenBroker(): ProviderTokenBroker {
  return new BasicAuthTokenBroker();
}
