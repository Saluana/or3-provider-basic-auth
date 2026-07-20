import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { getBasicAuthConfig } from './config';

function graceKey(): Buffer {
  return createHash('sha256')
    .update(`basic-auth-rotation-grace:${getBasicAuthConfig().refreshSecret}`)
    .digest();
}

/** Encrypt a successor refresh token for short-lived grace storage. */
export function sealRotationGraceToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', graceKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

/** Decrypt a grace-stored successor refresh token. Returns null on failure. */
export function unsealRotationGraceToken(sealed: string): string | null {
  try {
    const buf = Buffer.from(sealed, 'base64url');
    if (buf.length < 28) return null;

    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', graceKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
