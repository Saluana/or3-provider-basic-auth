import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../password';
import bcrypt from 'bcryptjs';

describe('password helpers', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('correct horse battery staple');

    expect(hash).not.toBe('correct horse battery staple');
    await expect(verifyPassword('correct horse battery staple', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong password', hash)).resolves.toBe(false);
  });

  it('accepts at most 72 UTF-8 bytes when setting a password', async () => {
    for (const password of ['a'.repeat(71), 'a'.repeat(72), 'é'.repeat(36)]) {
      const hash = await hashPassword(password);
      await expect(verifyPassword(password, hash)).resolves.toBe(true);
    }
    await expect(hashPassword('a'.repeat(73))).rejects.toThrow('72 UTF-8 bytes');
    await expect(hashPassword('é'.repeat(36) + 'a')).rejects.toThrow('72 UTF-8 bytes');
  });

  it('continues to verify existing bcrypt hashes without changing their semantics', async () => {
    const legacy = await bcrypt.hash('a'.repeat(72) + 'old-suffix', 4);
    await expect(verifyPassword('a'.repeat(72) + 'old-suffix', legacy)).resolves.toBe(true);
  });
});
