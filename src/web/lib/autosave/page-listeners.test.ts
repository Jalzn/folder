import { describe, expect, it, vi } from 'vitest';
import { type PageEvents, type WatchedSave, watchPage } from './page-listeners';
import type { SaveStatus } from './types';

function fakePage(visibilityState = 'hidden') {
  const win = new EventTarget();
  const doc = Object.assign(new EventTarget(), { visibilityState });
  const events: PageEvents = { window: win, document: doc };
  const fire = (target: EventTarget, type: string) => {
    const event = new Event(type, { cancelable: true });
    target.dispatchEvent(event);
    return event;
  };
  return {
    events,
    hide: () => fire(doc, 'visibilitychange'),
    online: () => fire(win, 'online'),
    leave: () => fire(win, 'beforeunload'),
  };
}

function fakeSave(status: SaveStatus, refused = false): WatchedSave & { flush: ReturnType<typeof vi.fn> } {
  return { getState: () => ({ status, refused }), flush: vi.fn(async () => true) };
}

/** Every session, an open editor's or one that outlived it, on the same table (decision 6). */
describe('watchPage', () => {
  it.each([
    ['dirty', false, true],
    ['saving', false, true],
    ['error', false, true],
    ['error', true, false],
    ['conflict', false, false],
    ['saved', false, false],
  ] as const)('when the tab hides in %s (refused: %s), saves: %s', (status, refused, saves) => {
    const page = fakePage();
    const save = fakeSave(status, refused);
    watchPage(save, page.events);
    page.hide();
    expect(save.flush).toHaveBeenCalledTimes(saves ? 1 : 0);
  });

  it('writes the draft whenever the visibility changes, but saves only when the tab is hidden', () => {
    const page = fakePage('visible');
    const save = fakeSave('error');
    const keep = vi.fn();
    watchPage(save, page.events, { keep });
    page.hide();
    expect(keep).toHaveBeenCalledOnce();
    expect(save.flush).not.toHaveBeenCalled();
  });

  it.each([
    ['error', true],
    ['dirty', false],
    ['conflict', false],
  ] as const)('when the network returns in %s, saves: %s', (status, saves) => {
    const page = fakePage();
    const save = fakeSave(status);
    watchPage(save, page.events);
    page.online();
    expect(save.flush).toHaveBeenCalledTimes(saves ? 1 : 0);
  });

  it.each([
    ['dirty', true],
    ['error', true],
    ['conflict', true],
    ['saved', false],
  ] as const)('before the page leaves in %s, warns and writes the draft: %s', (status, warns) => {
    const page = fakePage();
    const keep = vi.fn();
    watchPage(fakeSave(status), page.events, { keep });
    expect(page.leave().defaultPrevented).toBe(warns);
    expect(keep).toHaveBeenCalledTimes(warns ? 1 : 0);
  });

  it('stops listening once removed', () => {
    const page = fakePage();
    const save = fakeSave('error');
    watchPage(save, page.events)();
    page.hide();
    page.online();
    expect(save.flush).not.toHaveBeenCalled();
    expect(page.leave().defaultPrevented).toBe(false);
  });
});
