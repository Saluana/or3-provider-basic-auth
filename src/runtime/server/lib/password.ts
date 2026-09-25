import bcrypt from 'bcryptjs';
import { newPasswordFitsBcrypt } from '../../password-policy';

const PASSWORD_COST = 12;

export async function hashPassword(password: string): Promise<string> {
  if (!newPasswordFitsBcrypt(password)) {
    throw new RangeError('New passwords must be 72 UTF-8 bytes or fewer.');
  }
  return await bcrypt.hash(password, PASSWORD_COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
