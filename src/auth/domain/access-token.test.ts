import { describe, expect, it } from 'vitest';
import {
  accessTokenName,
  accessTokenPrefix,
  assertAccessTokenSlot,
  isAccessTokenFormat,
  LAST_USE_INTERVAL_MS,
  shouldRecordUse,
} from './access-token.js';

const token = `tf_mcp_Ab12Cd${'x'.repeat(37)}`;

describe('personal access token rules', () => {
  it('accepts only the prefix followed by 43 base64url characters', () => {
    expect(isAccessTokenFormat(token)).toBe(true);
    expect(isAccessTokenFormat(`tf_mcp_${'-_'.repeat(21)}a`)).toBe(true);
    for (const candidate of [
      token.slice(0, -1),
      `${token}x`,
      token.replace('tf_mcp_', 'tf_api_'),
      token.replace('x', '+'),
      token.replace('x', '='),
      ` ${token}`,
      'a'.repeat(64),
    ])
      expect(isAccessTokenFormat(candidate), candidate).toBe(false);
  });
  it('keeps the prefix and six random characters for display', () => {
    expect(accessTokenPrefix(token)).toBe('tf_mcp_Ab12Cd');
  });
  it('trims names and requires 1 to 100 characters', () => {
    expect(accessTokenName('  Claude Code — notebook ')).toBe('Claude Code — notebook');
    expect(accessTokenName('x'.repeat(100))).toHaveLength(100);
    expect(() => accessTokenName('   ')).toThrow('entre 1 e 100');
    expect(() => accessTokenName('x'.repeat(101))).toThrow('entre 1 e 100');
  });
  it('refuses an eleventh active token', () => {
    expect(() => assertAccessTokenSlot(9)).not.toThrow();
    expect(() => assertAccessTokenSlot(10)).toThrow('Você já tem 10 tokens. Revogue um para gerar outro.');
  });
  it('records the last use at most once per interval', () => {
    const now = new Date('2026-10-31T12:00:00Z');
    const before = (ms: number) => new Date(now.getTime() - ms).toISOString();
    expect(shouldRecordUse(null, now)).toBe(true);
    expect(shouldRecordUse(before(LAST_USE_INTERVAL_MS - 1), now)).toBe(false);
    expect(shouldRecordUse(before(LAST_USE_INTERVAL_MS), now)).toBe(true);
  });
});
