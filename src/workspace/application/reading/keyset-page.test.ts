import { describe, expect, it } from 'vitest';
import { keysetPage } from './keyset-page.js';

describe('keyset page', () => {
  it('points after the last item shown, and nowhere once the list is done', () => {
    const page = keysetPage({ items: ['a', 'b', 'c'], hasMore: false }, (item) => `depois de ${item}`);
    expect(page.items).toEqual(['a', 'b', 'c']);
    expect(page.nextCursor(2)).toBe('depois de b');
    expect(page.nextCursor(3)).toBeNull();
    expect(keysetPage({ items: ['a'], hasMore: true }, (item) => item).nextCursor(1)).toBe('a');
    expect(keysetPage({ items: [], hasMore: false }, (item) => item).nextCursor(0)).toBeNull();
  });
});
