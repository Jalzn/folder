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

  it('withdraws the undo of a superseded toast, but not a newer one', () => {
    const slot = createUndoSlot();
    const undo = vi.fn();
    slot.show(1, undo);
    slot.withdraw(2);
    expect(slot.offeredBy()).toBe(1);
    slot.withdraw(1);
    expect(slot.take()).toBeNull();
  });

  it('tells a toast when its undo can no longer run, but not when the undo is taken', () => {
    const slot = createUndoSlot();
    const gone = vi.fn();
    slot.show(1, vi.fn(), gone);
    slot.take();
    expect(gone).not.toHaveBeenCalled();
    slot.show(2, vi.fn(), gone);
    slot.show(3, vi.fn());
    expect(gone).toHaveBeenCalledOnce();
    slot.show(4, vi.fn(), gone);
    slot.leave(4);
    slot.show(5, vi.fn(), gone);
    slot.withdraw(5);
    expect(gone).toHaveBeenCalledTimes(3);
  });
});
