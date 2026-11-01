import { describe, expect, it, vi } from 'vitest';
import { createItemChanges } from './item-changes';

describe('createItemChanges', () => {
  it('keeps the latest change of each item', () => {
    const changes = createItemChanges();
    const first = changes.begin('document:a');
    const other = changes.begin('document:b');
    expect(changes.isLatest('document:a', first)).toBe(true);
    const second = changes.begin('document:a');
    expect(changes.isLatest('document:a', first)).toBe(false);
    expect(changes.isLatest('document:a', second)).toBe(true);
    expect(changes.isLatest('document:b', other)).toBe(true);
  });

  it('takes the undo back from the toast of a change that a newer one supersedes', () => {
    const changes = createItemChanges();
    const drop = vi.fn();
    const first = changes.begin('document:a');
    changes.offer('document:a', first, drop);
    changes.begin('document:b');
    expect(drop).not.toHaveBeenCalled();
    changes.begin('document:a');
    expect(drop).toHaveBeenCalledOnce();
  });

  it('drops at once the undo of a change already superseded when its toast comes', () => {
    const changes = createItemChanges();
    const drop = vi.fn();
    const first = changes.begin('document:a');
    changes.begin('document:a');
    changes.offer('document:a', first, drop);
    expect(drop).toHaveBeenCalledOnce();
  });

  it('lets an entry go once nothing can undo its change, but not a newer one', () => {
    const changes = createItemChanges();
    const first = changes.begin('document:a');
    changes.release('document:a', first);
    expect(changes.size()).toBe(0);
    expect(changes.isLatest('document:a', first)).toBe(false);
    const second = changes.begin('document:a');
    const third = changes.begin('document:a');
    changes.release('document:a', second);
    expect(changes.isLatest('document:a', third)).toBe(true);
    expect(changes.size()).toBe(1);
  });
});
