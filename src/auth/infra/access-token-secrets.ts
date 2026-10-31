import { createHash, randomBytes } from 'node:crypto';
import type { AccessTokenSecrets } from '../application/access-tokens/ports.js';
import { ACCESS_TOKEN_PREFIX, isAccessTokenFormat } from '../domain/access-token.js';

// 256 random bits make a fast hash safe and let the digest be an indexed lookup, as with sessions.
const digest = (token: string) => createHash('sha256').update(token).digest('hex');

export const accessTokenSecrets: AccessTokenSecrets = {
  create() {
    const token = `${ACCESS_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
    return { token, digest: digest(token) };
  },
  digest,
  isWellFormed: isAccessTokenFormat,
};
