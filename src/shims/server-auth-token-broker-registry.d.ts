declare module '~~/server/auth/token-broker/registry' {
  export function registerProviderTokenBroker(
    id: string,
    create: () => { getProviderToken: (...args: any[]) => Promise<string | null> }
  ): void;
}
