import { describe, expect, it } from 'vitest';
import type { SaveStatus } from './index';
import { isPendingSave, pendingSaves, registerSave, subscribePendingSaves } from './save-registry';

function fakeController(status: SaveStatus) {
  const listeners = new Set<() => void>();
  let state = { status };
  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set(next: SaveStatus) {
      state = { status: next };
      for (const listener of listeners) listener();
    },
  };
}

describe('save registry', () => {
  it('marks an item pending while its change is not confirmed, or after a failure', () => {
    const controller = fakeController('saved');
    const unregister = registerSave('document', 'd1', controller);
    let notified = 0;
    const unsubscribe = subscribePendingSaves(() => notified++);
    expect(isPendingSave(pendingSaves(), 'document', 'd1')).toBe(false);
    controller.set('dirty');
    expect(isPendingSave(pendingSaves(), 'document', 'd1')).toBe(true);
    controller.set('saving');
    controller.set('error');
    expect(isPendingSave(pendingSaves(), 'document', 'd1')).toBe(true);
    expect(notified).toBe(1);
    controller.set('saved');
    expect(isPendingSave(pendingSaves(), 'document', 'd1')).toBe(false);
    expect(notified).toBe(2);
    unsubscribe();
    unregister();
  });

  it('tells documents from drawings and forgets an unregistered item', () => {
    const drawing = fakeController('conflict');
    const unregister = registerSave('drawing', 'x', drawing);
    expect(isPendingSave(pendingSaves(), 'drawing', 'x')).toBe(true);
    expect(isPendingSave(pendingSaves(), 'document', 'x')).toBe(false);
    unregister();
    expect(isPendingSave(pendingSaves(), 'drawing', 'x')).toBe(false);
  });

  it('keeps the same set while nothing changes', () => {
    const first = pendingSaves();
    const unregister = registerSave('document', 'quiet', fakeController('saved'));
    expect(pendingSaves()).toBe(first);
    unregister();
  });
});
