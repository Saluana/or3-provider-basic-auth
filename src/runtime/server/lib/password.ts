import bcrypt from 'bcryptjs';
import { newPasswordFitsBcrypt } from '../../password-policy';

const PASSWORD_COST = 12;

function assertPasswordLength(password: string): void {
  if (!newPasswordFitsBcrypt(password)) {
    throw new RangeError('New passwords must be 72 UTF-8 bytes or fewer.');
  }
}

// Startup plugins run synchronously in Nitro 2. Only bootstrap uses this path;
// request-time password operations must continue yielding to the event loop.
export function hashPasswordSync(password: string): string {
  assertPasswordLength(password);
  return bcrypt.hashSync(password, PASSWORD_COST);
}

export async function hashPassword(password: string): Promise<string> {
  assertPasswordLength(password);
  return await bcrypt.hash(password, PASSWORD_COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
