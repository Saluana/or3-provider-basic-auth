export interface BasicAuthAccount {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  token_version: number;
  created_at: number;
  updated_at: number;
}

export interface BasicAuthSession {
  id: string;
  account_id: string;
  refresh_token_hash: string;
  expires_at: number;
  revoked_at: number | null;
  created_at: number;
  rotated_from_session_id: string | null;
  replaced_by_session_id: string | null;
  /** Epoch ms until concurrent same-token refresh may reuse successor tokens. */
  rotation_grace_until: number | null;
  /** AES-GCM sealed successor refresh token, cleared after grace expires. */
  rotation_grace_refresh_token: string | null;
  ip_address: string | null;
  user_agent: string | null;
}
