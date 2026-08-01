import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

type RegistrationMode = 'open' | 'invite_only' | 'disabled';

type InviteStore = {
  validateInvite?: (input: {
    workspaceId: string;
    email: string;
    tokenHash: string;
  }) => Promise<{ ok: boolean }>;
};

type DeniedReason =
  | 'disabled'
  | 'invite_required'
  | 'invite_secret_missing'
  | 'invite_invalid'
  | 'invite_expired'
  | 'invite_unsupported';

export type RegistrationDecision =
  | { allowed: true; mode: RegistrationMode; invite: null }
  | { allowed: false; mode: RegistrationMode; reason: DeniedReason };

export function resolveRegistrationMode(config: {
  auth?: { registrationMode?: RegistrationMode };
}): RegistrationMode {
  return config.auth?.registrationMode ?? 'open';
}

function deny(mode: RegistrationMode, reason: DeniedReason): RegistrationDecision {
  return { allowed: false, mode, reason };
}

export async function validateInviteRegistration(input: {
  store: InviteStore;
  mode: RegistrationMode;
  email: string;
  inviteToken?: string | null;
}): Promise<RegistrationDecision> {
  if (input.mode === 'disabled') return deny(input.mode, 'disabled');
  if (input.mode === 'open') return { allowed: true, mode: input.mode, invite: null };
  if (!input.inviteToken) return deny(input.mode, 'invite_required');

  const config = (globalThis as typeof globalThis & {
    useRuntimeConfig?: () => { auth?: { invite?: { tokenSecret?: string } } };
  }).useRuntimeConfig?.();
  const secret = config?.auth?.invite?.tokenSecret;
  if (!secret) return deny(input.mode, 'invite_secret_missing');

  const [encoded, signature, extra] = input.inviteToken.split('.');
  if (!encoded || !signature || extra) return deny(input.mode, 'invite_invalid');
  const expected = createHmac('sha256', secret).update(encoded).digest('base64url');
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return deny(input.mode, 'invite_invalid');
  }

  let payload: { workspaceId?: string; email?: string; exp?: number };
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return deny(input.mode, 'invite_invalid');
  }
  if (!payload.workspaceId || !payload.email || !payload.exp) return deny(input.mode, 'invite_invalid');
  if (payload.exp * 1000 <= Date.now()) return deny(input.mode, 'invite_expired');
  if (payload.email.trim().toLowerCase() !== input.email.trim().toLowerCase()) {
    return deny(input.mode, 'invite_invalid');
  }

  if (!input.store.validateInvite) return deny(input.mode, 'invite_unsupported');
  const tokenHash = createHash('sha256').update(input.inviteToken).digest('hex');
  const result = await input.store.validateInvite({
    workspaceId: payload.workspaceId,
    email: input.email.trim().toLowerCase(),
    tokenHash
  });
  return result.ok
    ? { allowed: true, mode: input.mode, invite: null }
    : deny(input.mode, 'invite_invalid');
}
