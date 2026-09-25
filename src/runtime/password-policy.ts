export const MAX_BCRYPT_PASSWORD_BYTES = 72;

export function newPasswordFitsBcrypt(password: string): boolean {
  return new TextEncoder().encode(password).length <= MAX_BCRYPT_PASSWORD_BYTES;
}
