import { describe, expect, it, vi } from 'vitest';
import type { SaveStatus } from './index';
import { createSessionPool, type PageEvents } from './session-pool';

/** An autosave whose status the test sets; a flush records itself and saves when told to. */
function fakeController(status: SaveStatus = 'saved') {
  const listeners = new Set<() => void>();
  const state = { status, refused: false };
  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    flush: vi.fn(async () => true),
    set(next: SaveStatus) {
      state.status = next;
      for (const listener of [...listeners]) listener();
    },
  };
}

function fakePage(): PageEvents & { fire: (target: 'window' | 'document', type: string) => Event } {
  const win = new EventTarget();
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  return {
    window: win,
    document: doc,
    fire: (target, type) => {
      const event = new Event(type, { cancelable: true });
      (target === 'window' ? win : doc).dispatchEvent(event);
      return event;
    },
  };
}

function setup() {
  const page = fakePage();
  const unregister = vi.fn();
  const pool = createSessionPool<ReturnType<typeof fakeController>>({
    register: () => unregister,
    events: () => page,
  });
  return { page, unregister, pool };
}

describe('createSessionPool', () => {
  it('keeps one controller per identity while it lives', () => {
    const { pool } = setup();
    const first = pool.controllerOf('i:task:a', 'a', () => fakeController());
    expect(pool.controllerOf('i:task:a', 'a', () => fakeController())).toBe(first);
    expect(pool.size()).toBe(1);
  });

  it('lets a saved session go when the editor releases it', () => {
    const { pool, unregister } = setup();
    pool.controllerOf('i:task:a', 'a', () => fakeController('saved'));
    const release = pool.hold('i:task:a');
    release();
    expect(pool.size()).toBe(0);
    expect(unregister).toHaveBeenCalledOnce();
  });

  it('keeps an unsaved session, which retries online and warns before leaving until it is saved', () => {
    const { pool, page, unregister } = setup();
    const controller = pool.controllerOf('i:task:a', 'a', () => fakeController('error'));
    pool.hold('i:task:a')();
    expect(pool.size()).toBe(1);

    page.fire('window', 'online');
    expect(controller.flush).toHaveBeenCalledOnce();
    expect(page.fire('window', 'beforeunload').defaultPrevented).toBe(true);

    controller.set('saved');
    expect(pool.size()).toBe(0);
    expect(unregister).toHaveBeenCalledOnce();
    // Gone with the session: no more retries nor warnings.
    page.fire('window', 'online');
    expect(controller.flush).toHaveBeenCalledOnce();
    expect(page.fire('window', 'beforeunload').defaultPrevented).toBe(false);
  });

  it('gives the listeners back to the editor that holds the session again', () => {
    const { pool, page } = setup();
    const controller = pool.controllerOf('i:task:a', 'a', () => fakeController('error'));
    pool.hold('i:task:a')();
    const release = pool.hold('i:task:a');
    page.fire('window', 'online');
    expect(controller.flush).not.toHaveBeenCalled();
    controller.set('saved');
    expect(pool.size()).toBe(1);
    release();
    expect(pool.size()).toBe(0);
  });
});
