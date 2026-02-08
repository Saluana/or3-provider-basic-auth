import type { H3Event } from 'h3';

interface ProviderTokenRequest {
  providerId: string;
  template?: string;
}

interface ProviderTokenBroker {
  getProviderToken(event: H3Event, req: ProviderTokenRequest): Promise<string | null>;
}

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
