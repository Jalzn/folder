import { describe, expect, it } from 'vitest';
import { lacksBlockIds } from './block-ids';

describe('lacksBlockIds', () => {
  it('finds a block without an id at any depth', () => {
    expect(lacksBlockIds([{ id: 'a', type: 'paragraph' }])).toBe(false);
    expect(lacksBlockIds([{ type: 'paragraph' }])).toBe(true);
    expect(
      lacksBlockIds([
        { id: 'quote', type: 'quote', children: [{ id: 'p', type: 'paragraph' }, { type: 'mathBlock' }] },
      ]),
    ).toBe(true);
    expect(lacksBlockIds([])).toBe(false);
  });
});
