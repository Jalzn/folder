import { describe, expect, it, vi } from 'vitest';
import { createItemChanges } from './item-changes';
import { type ChangeToast, runUndoableChange, type UndoableChangeDeps } from './undoable-change';
import { createWriteQueue } from './write-queue';

/** The protocol with useAction's queue and a toast that keeps its undo, without React. */
function setup() {
  const queue = createWriteQueue();
  const failures: unknown[] = [];
  const toasts: { id: number; text: string; undo: (() => unknown) | undefined; gone: (() => void) | undefined }[] = [];
  const announced: string[] = [];
  const withdrawn: number[] = [];
  const changes = createItemChanges();
  const run = <T>(work: () => Promise<T>, success?: (value: T) => void, options: { queued?: boolean } = {}) => {
    const attempt = async () => {
      try {
        const value = await work();
        success?.(value);
        return value;
      } catch (error) {
        failures.push(error);
        return undefined;
      }
    };
    return (options.queued ? queue.after(attempt) : queue.start(attempt)) ?? Promise.resolve(undefined);
  };
  const deps: UndoableChangeDeps = {
    run,
    toast: (text, options) => {
      toasts.push({ id: toasts.length, text, undo: options?.undo, gone: options?.onUndoGone });
      return toasts.length - 1;
    },
    announce: (text) => announced.push(text),
    withdrawUndo: (id) => withdrawn.push(id),
    changes,
    superseded: 'Mudou depois.',
  };
  const change = <T>(
    write: () => Promise<T>,
    done: (value: T) => ChangeToast | null,
    { key = 'task:a', queued = false } = {},
  ) => runUndoableChange(deps, key, write, done, { queued });
  return { change, changes, toasts, announced, withdrawn, failures };
}

const conflict = () => Object.assign(new Error('mudou'), { code: 'VERSION_CONFLICT' });

describe('runUndoableChange', () => {
  it('shows the toast with its undo, which runs the reverse write and then lets the change go', async () => {
    const { change, changes, toasts } = setup();
    const undo = vi.fn(async () => undefined);
    const undone = vi.fn();
    expect(
      await change(
        async () => 'feito',
        (value) => ({ text: `Ok: ${value}`, undo, undone }),
      ),
    ).toBe('feito');
    expect(toasts.map((toast) => toast.text)).toEqual(['Ok: feito']);
    expect(changes.size()).toBe(1);
    await toasts[0]?.undo?.();
    expect(undo).toHaveBeenCalledOnce();
    expect(undone).toHaveBeenCalledOnce();
    expect(changes.size()).toBe(0);
  });

  it('shows a toast without undo, or none, and keeps no change', async () => {
    const { change, changes, toasts } = setup();
    await change(
      async () => 1,
      () => ({ text: 'Só aviso' }),
    );
    await change(
      async () => 2,
      () => null,
    );
    expect(toasts.map((toast) => toast.text)).toEqual(['Só aviso']);
    expect(toasts[0]?.undo).toBeUndefined();
    expect(changes.size()).toBe(0);
  });

  it('shows nothing for a failed write, and lets its change go', async () => {
    const { change, changes, toasts, failures } = setup();
    const done = vi.fn(() => ({ text: 'Ok', undo: async () => undefined }));
    expect(
      await change(async () => {
        throw new Error('caiu');
      }, done),
    ).toBeUndefined();
    expect(done).not.toHaveBeenCalled();
    expect(toasts).toHaveLength(0);
    expect(failures).toHaveLength(1);
    expect(changes.size()).toBe(0);
  });

  it('leaves the last toast its undo when a write is refused while another runs', async () => {
    const { change, toasts, withdrawn } = setup();
    await change(
      async () => 1,
      () => ({ text: 'Primeira', undo: async () => undefined }),
    );
    let finish: () => void = () => undefined;
    const slow = change(
      () =>
        new Promise<number>((resolve) => {
          finish = () => resolve(2);
        }),
      () => ({ text: 'Outro item', undo: async () => undefined }),
      { key: 'task:b' },
    );
    expect(
      await change(
        async () => 3,
        () => ({ text: 'Recusada', undo: async () => undefined }),
      ),
    ).toBeUndefined();
    finish();
    await slow;
    expect(toasts.map((toast) => toast.text)).toEqual(['Primeira', 'Outro item']);
    expect(withdrawn).toEqual([]);
  });

  it('takes the undo from the toast of a change a newer one of the same object superseded', async () => {
    const { change, toasts, withdrawn, announced } = setup();
    const first = vi.fn(async () => undefined);
    await change(
      async () => 1,
      () => ({ text: 'Primeira', undo: first }),
    );
    await change(
      async () => 2,
      () => ({ text: 'Segunda', undo: async () => undefined }),
    );
    expect(withdrawn).toEqual([0]);
    await toasts[0]?.undo?.();
    expect(first).not.toHaveBeenCalled();
    expect(announced).toEqual(['Mudou depois.']);
  });

  it('does nothing when a change of the object queued before the undo runs first', async () => {
    const { change, toasts, announced } = setup();
    const undo = vi.fn(async () => undefined);
    await change(
      async () => 1,
      () => ({ text: 'Primeira', undo }),
    );
    let finish: () => void = () => undefined;
    const slow = change(
      () =>
        new Promise<number>((resolve) => {
          finish = () => resolve(2);
        }),
      () => null,
      { key: 'task:b' },
    );
    const waiting = change(
      async () => 3,
      () => null,
      { queued: true },
    );
    const undoing = toasts[0]?.undo?.();
    finish();
    await Promise.all([slow, waiting, undoing]);
    expect(undo).not.toHaveBeenCalled();
    expect(announced).toEqual(['Mudou depois.']);
  });

  it('says `changed` when the undo meets a newer version, and without it reports the failure', async () => {
    const { change, toasts, failures } = setup();
    await change(
      async () => 1,
      () => ({ text: 'Com aviso', undo: async () => Promise.reject(conflict()), changed: 'Mudou.' }),
    );
    await toasts[0]?.undo?.();
    expect(toasts.map((toast) => toast.text)).toEqual(['Com aviso', 'Mudou.']);
    expect(failures).toEqual([]);

    await change(
      async () => 2,
      () => ({ text: 'Sem aviso', undo: async () => Promise.reject(conflict()) }),
      {
        key: 'task:b',
      },
    );
    await toasts[2]?.undo?.();
    expect(failures).toHaveLength(1);
    expect(toasts).toHaveLength(3);
  });
});
