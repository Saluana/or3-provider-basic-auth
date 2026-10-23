declare module '~~/server/auth/invite-token' {
  export function verifyInviteToken(token: string, secret: string, nowMs?: number):
    | { ok: true; payload: { email: string; exp: number } }
    | { ok: false; reason: string };
}
