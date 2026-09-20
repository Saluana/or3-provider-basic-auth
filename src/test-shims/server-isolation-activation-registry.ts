const calls: Array<{ userId: string; reason: string }> = [];

/** Calls the provider under test recorded through the stubbed host registry. */
export function __revokeHostActivationsForUserCalls(): Array<{
  userId: string;
  reason: string;
}> {
  return [...calls];
}

export function __resetRevokeHostActivationsForUserCalls(): void {
  calls.length = 0;
}

export function revokeHostActivationsForUser(userId: string, reason: string): string[] {
  calls.push({ userId, reason });
  return [];
}
