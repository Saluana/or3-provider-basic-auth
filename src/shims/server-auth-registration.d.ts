declare module '~~/server/auth/registration' {
  import type { H3Event } from 'h3';
  import type { AuthWorkspaceStore } from '~~/server/auth/store/types';

  export type RegistrationMode = 'open' | 'invite_only' | 'disabled';

  export type RegistrationDecision =
    | { allowed: true; mode: RegistrationMode; invite: null }
    | {
        allowed: true;
        mode: 'invite_only';
        invite: {
          token: string;
          tokenHash: string;
          payload: {
            workspaceId: string;
            email: string;
            exp: number;
          };
        };
      }
    | {
        allowed: false;
        mode: RegistrationMode;
        reason:
          | 'disabled'
          | 'invite_required'
          | 'invite_secret_missing'
          | 'invite_invalid'
          | 'invite_expired'
          | 'invite_unsupported';
      };

  export function resolveRegistrationMode(config: ReturnType<typeof useRuntimeConfig>): RegistrationMode;
  export function evaluateUnknownUserRegistration(input: {
    event: H3Event;
    store: AuthWorkspaceStore;
    mode: RegistrationMode;
    inviteToken?: string | null;
  }): RegistrationDecision;
}
