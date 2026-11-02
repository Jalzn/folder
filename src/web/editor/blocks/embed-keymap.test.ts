import { describe, expect, it } from 'vitest';
import { EMBED_KEYS, holdsKey, keyName } from './embed-keymap';

type Facts = Parameters<typeof holdsKey>[0];
const press = (key: string, mods: Partial<Omit<Facts, 'key'>> = {}): Facts => ({
  key,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  isComposing: false,
  ...mods,
});

/** A key of the table as the event that makes it: `Shift-ArrowDown` is ⇧ with ↓. */
function eventOf(name: string): Facts {
  const parts = name.split('-');
  const key = parts.pop() ?? '';
  return press(key, {
    shiftKey: parts.includes('Shift'),
    metaKey: parts.includes('Meta'),
    ctrlKey: parts.includes('Ctrl'),
    altKey: parts.includes('Alt'),
  });
}

/**
 * The keys the drift guard held before the table (embed-selection-hold.ts at stage 11's end), kept here to
 * prove the table holds the same ones.
 */
function heldBefore(event: Facts) {
  const plain = [
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'Enter',
    'Backspace',
    'Delete',
    'PageUp',
    'PageDown',
  ];
  if (event.altKey || event.isComposing) return false;
  if (event.metaKey || event.ctrlKey)
    return (
      !event.shiftKey &&
      event.metaKey !== event.ctrlKey &&
      (event.metaKey ? ['ArrowUp', 'ArrowDown'] : ['Home', 'End']).includes(event.key)
    );
  return (event.shiftKey ? ['ArrowUp', 'ArrowDown'] : plain).includes(event.key);
}

describe('the embed keymap', () => {
  it('names each key once, in the keymap’s own form', () => {
    const names = EMBED_KEYS.map((each) => each.key);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(keyName(eventOf(name))).toBe(name);
  });

  it('holds the selection for every key that moves it from an embed, and not for Tab nor ⇧Tab', () => {
    for (const each of EMBED_KEYS) expect(holdsKey(eventOf(each.key))).toBe(each.holds);
    expect(EMBED_KEYS.filter((each) => !each.holds).map((each) => each.key)).toEqual(['Tab', 'Shift-Tab']);
  });

  it('leaves out the keys the embeds do not take, and any key in a composition', () => {
    for (const event of [
      press('ArrowDown', { altKey: true }),
      press('ArrowDown', { metaKey: true, ctrlKey: true }),
      press('ArrowDown', { metaKey: true, shiftKey: true }),
      press('ArrowDown', { ctrlKey: true }),
      press('Home', { metaKey: true }),
      press('Home'),
      press('Enter', { shiftKey: true }),
      press('ArrowLeft', { shiftKey: true }),
      press('a'),
      press('ArrowDown', { isComposing: true }),
    ])
      expect(holdsKey(event)).toBe(false);
  });

  it('holds exactly the keys the guard held before the table', () => {
    const keys = [
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Enter',
      'Backspace',
      'Delete',
      'PageUp',
      'PageDown',
      'Home',
      'End',
      'Tab',
      'Escape',
      'a',
      ' ',
    ];
    for (const key of keys)
      for (let mask = 0; mask < 32; mask += 1) {
        const event = press(key, {
          shiftKey: Boolean(mask & 1),
          metaKey: Boolean(mask & 2),
          ctrlKey: Boolean(mask & 4),
          altKey: Boolean(mask & 8),
          isComposing: Boolean(mask & 16),
        });
        expect(holdsKey(event), `${keyName(event)}${event.isComposing ? ' composing' : ''}`).toBe(heldBefore(event));
      }
  });
});
