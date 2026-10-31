import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { accessTokenSecrets } from './access-token-secrets.js';

describe('access token secrets', () => {
  it('generates distinct well-formed tokens and stores only their SHA-256', () => {
    const first = accessTokenSecrets.create();
    const second = accessTokenSecrets.create();
    expect(first.token).not.toBe(second.token);
    expect(accessTokenSecrets.isWellFormed(first.token)).toBe(true);
    expect(first.digest).toBe(createHash('sha256').update(first.token).digest('hex'));
    expect(accessTokenSecrets.digest(first.token)).toBe(first.digest);
    expect(first.digest).not.toContain(first.token.slice(7));
  });
});
