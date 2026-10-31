import { describe, expect, it } from 'vitest';
import { readBearer } from './bearer.js';

describe('bearer credential', () => {
  it('reads the token with any scheme case and surrounding blanks', () => {
    expect(readBearer('Bearer tf_mcp_abc-_123')).toBe('tf_mcp_abc-_123');
    expect(readBearer('bearer \t tf_mcp_abc ')).toBe('tf_mcp_abc');
    expect(readBearer('BEARER abc==')).toBe('abc==');
  });
  it('refuses other schemes, missing tokens and extra parts', () => {
    for (const header of [
      undefined,
      '',
      'Bearer',
      'Bearer ',
      'Basic dXNlcg==',
      'Bearertoken',
      'Bearer a b',
      'Bearer a,b',
      ' Bearer a',
    ])
      expect(readBearer(header), String(header)).toBeUndefined();
  });
});
