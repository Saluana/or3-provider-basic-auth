declare module '~~/server/auth/token-broker/registry' {
  import type { ProviderTokenBroker } from '~~/server/auth/token-broker/types';

  export function registerProviderTokenBroker(
    id: string,
    create: () => ProviderTokenBroker
  ): void;
}
