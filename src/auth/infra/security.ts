import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { createSlidingWindow } from '#core/infra';
import { authErrors } from '../application/errors.js';
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
  isWellFormed: (token: string) => /^[a-f0-9]{64}$/.test(token),
};

/** At most 10 login attempts per IP in any minute, on the same sliding window as the MCP limits. */
export function createLoginThrottle(): LoginThrottle {
  const attempts = createSlidingWindow({ limit: 10, windowMs: 60_000, maxKeys: 10_000 });
  return {
    check(ip, now) {
      if (attempts.blockedFor(ip, now)) throw authErrors.loginRateLimited();
      attempts.record(ip, now);
    },
  };
}
