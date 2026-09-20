declare module '~~/server/utils/plugins/isolation/activation-registry' {
  export function revokeHostActivationsForUser(
    userId: string,
    reason: string
  ): readonly string[];
}
