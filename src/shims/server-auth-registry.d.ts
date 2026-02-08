declare module '~~/server/auth/registry' {
  export function registerAuthProvider(input: {
    id: string;
    order?: number;
    create: () => unknown;
  }): void;
}
