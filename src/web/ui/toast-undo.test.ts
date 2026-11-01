import { describe, expect, it, vi } from 'vitest';
import { createUndoSlot } from './toast-undo';

describe('createUndoSlot', () => {
  it('offers the undo of the toast on screen, once', () => {
    const slot = createUndoSlot();
    const undo = vi.fn();
    slot.show(1, undo);
    expect(slot.offeredBy()).toBe(1);
    slot.take()?.();
    expect(undo).toHaveBeenCalledOnce();
    expect(slot.take()).toBeNull();
  });

  it('lets the newest toast replace it, with its undo or with none', () => {
    const slot = createUndoSlot();
    const first = vi.fn();
    const second = vi.fn();
    slot.show(1, first);
    slot.show(2, second);
    slot.take()?.();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    slot.show(3, first);
    slot.show(4);
    expect(slot.take()).toBeNull();
  });

  it('runs nothing once its toast leaves, but keeps a newer one', () => {
    const slot = createUndoSlot();
    slot.show(1, vi.fn());
    slot.leave(1);
    expect(slot.take()).toBeNull();
    const newer = vi.fn();
    slot.show(2, vi.fn());
    slot.show(3, newer);
    slot.leave(2);
    slot.take()?.();
    expect(newer).toHaveBeenCalledOnce();
  });
});
