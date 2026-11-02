import { describe, expect, it } from 'vitest';
import { type BlockPlace, putBackRemoved } from './embed-removal';

/** A document as a list of block IDs. */
function documentOf(ids: string[]): BlockPlace<{ id: string }> & { ids: string[] } {
  return {
    ids,
    has: (id) => ids.includes(id),
    insertAfter: (block, referenceId) => ids.splice(ids.indexOf(referenceId) + 1, 0, block.id),
    insertAt: (block, index) => ids.splice(Math.min(index, ids.length), 0, block.id),
  };
}

describe('putBackRemoved', () => {
  it('brings the block back after the one that came before it', () => {
    const document = documentOf(['a', 'c']);
    expect(putBackRemoved(document, { id: 'b' }, { previousId: 'a', index: 1 })).toBe(true);
    expect(document.ids).toEqual(['a', 'b', 'c']);
  });

  it('brings it back first when it was first', () => {
    const first = documentOf(['c']);
    expect(putBackRemoved(first, { id: 'b' }, { previousId: null, index: 0 })).toBe(true);
    expect(first.ids).toEqual(['b', 'c']);
  });

  it('brings it back at its index when the block before it is gone, never at the top for that', () => {
    // Between "Cinco" and "Seis"; "Cinco" deleted afterwards.
    const document = documentOf(['um', 'dois', 'tres', 'quatro', 'seis']);
    expect(putBackRemoved(document, { id: 'card' }, { previousId: 'cinco', index: 5 })).toBe(true);
    expect(document.ids).toEqual(['um', 'dois', 'tres', 'quatro', 'seis', 'card']);
    const shorter = documentOf(['um', 'seis']);
    expect(putBackRemoved(shorter, { id: 'card' }, { previousId: 'cinco', index: 1 })).toBe(true);
    expect(shorter.ids).toEqual(['um', 'card', 'seis']);
  });

  it('does nothing after the editor’s ⌘Z brought the block back, so it is never there twice', () => {
    const document = documentOf(['a', 'b', 'c']);
    expect(putBackRemoved(document, { id: 'b' }, { previousId: 'a', index: 1 })).toBe(false);
    expect(document.ids).toEqual(['a', 'b', 'c']);
  });
});
