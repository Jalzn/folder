import { describe, expect, it } from 'vitest';
import { type BlockPlace, putBackRemoved } from './embed-removal';

/** A document as a list of block IDs. */
function documentOf(ids: string[]): BlockPlace<{ id: string }> & { ids: string[] } {
  return {
    ids,
    has: (id) => ids.includes(id),
    insertAfter: (block, referenceId) => ids.splice(ids.indexOf(referenceId) + 1, 0, block.id),
    insertFirst: (block) => ids.unshift(block.id),
  };
}

describe('putBackRemoved', () => {
  it('brings the block back after the one that came before it', () => {
    const document = documentOf(['a', 'c']);
    expect(putBackRemoved(document, { id: 'b' }, 'a')).toBe(true);
    expect(document.ids).toEqual(['a', 'b', 'c']);
  });

  it('brings it back first when it was first, or when the block before it is gone', () => {
    const first = documentOf(['c']);
    expect(putBackRemoved(first, { id: 'b' }, null)).toBe(true);
    expect(first.ids).toEqual(['b', 'c']);
    const gone = documentOf(['c']);
    expect(putBackRemoved(gone, { id: 'b' }, 'a')).toBe(true);
    expect(gone.ids).toEqual(['b', 'c']);
  });

  it('does nothing after the editor’s ⌘Z brought the block back, so it is never there twice', () => {
    const document = documentOf(['a', 'b', 'c']);
    expect(putBackRemoved(document, { id: 'b' }, 'a')).toBe(false);
    expect(document.ids).toEqual(['a', 'b', 'c']);
  });
});
