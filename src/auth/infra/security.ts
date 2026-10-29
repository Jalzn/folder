import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { AppError } from '@tinyfold/core/application';
import type { LoginThrottle } from '../application/ports.js';

const scrypt = promisify(scryptCallback) as (password: string, salt: string, length: number) => Promise<Buffer>;
export const passwordHasher = {
  async hash(value: string) {
    const salt = randomBytes(16).toString('hex');
    return `scrypt:${salt}:${(await scrypt(value, salt, 64)).toString('hex')}`;
  },
  async verify(value: string, encoded: string) {
    const [algorithm, salt, digest] = encoded.split(':');
    if (algorithm !== 'scrypt' || !salt || !digest || !/^[a-f0-9]{128}$/.test(digest)) return false;
    const actual = await scrypt(value, salt, 64);
    return timingSafeEqual(Buffer.from(digest, 'hex'), actual);
  },
};
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
export const sessionTokens = {
  create() {
    const token = randomBytes(32).toString('hex');
    return { token, digest: digest(token) };
  },
  digest,
  valid: (token: string) => /^[a-f0-9]{64}$/.test(token),
};

export function createLoginThrottle(): LoginThrottle {
  const entries = new Map<string, { start: number; count: number }>();
  return {
    check(ip, now) {
      for (const [key, value] of entries) if (now - value.start >= 60_000) entries.delete(key);
      const record = entries.get(ip) ?? { start: now, count: 0 };
      if (record.count >= 10 || (!entries.has(ip) && entries.size >= 10_000))
        throw new AppError('RATE_LIMITED', 'Muitas tentativas. Aguarde um minuto e tente novamente.');
      record.count += 1;
      entries.set(ip, record);
    },
  };
}
