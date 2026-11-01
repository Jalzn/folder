import { describe, expect, it } from 'vitest';
import { CHORD_TIMEOUT_MS, createChords } from './chords';
import { acceptsPalette, acceptsPlainKey, acceptsUndo, commandKey, isComposing, type KeyPress } from './guards';
import { createLayerStack, escapeAction } from './layers';

const press = (key: string, modifiers: Partial<KeyPress> = {}): KeyPress => ({
  key,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...modifiers,
});
const outside = { editable: false, inDrawing: false };

describe('guards', () => {
  it('lets ⌘Z undo a toast only outside fields, editors and overlays', () => {
    const z = press('z', { metaKey: true });
    expect(acceptsUndo(z, outside)).toBe(true);
    expect(acceptsUndo(z, { editable: true, inDrawing: false })).toBe(false);
    expect(acceptsUndo(z, { editable: false, inDrawing: true })).toBe(false);
    expect(acceptsUndo(z, { editable: false, inDrawing: false, inOverlay: true })).toBe(false);
    // ⌘⇧Z redoes, and ⌥ changes the key on some layouts.
    expect(acceptsUndo(press('z', { metaKey: true, shiftKey: true }), outside)).toBe(false);
    expect(acceptsUndo(press('z', { metaKey: true, altKey: true }), outside)).toBe(false);
  });

  it('lets single keys work only outside fields and the drawing editor, without modifiers', () => {
    expect(acceptsPlainKey(press('n'), outside)).toBe(true);
    expect(acceptsPlainKey(press('n'), { editable: true, inDrawing: false })).toBe(false);
    expect(acceptsPlainKey(press('n'), { editable: false, inDrawing: true })).toBe(false);
    expect(acceptsPlainKey(press('n'), { editable: false, inDrawing: false, inOverlay: true })).toBe(false);
    expect(acceptsPlainKey(press('n', { metaKey: true }), outside)).toBe(false);
    expect(acceptsPlainKey(press('n', { ctrlKey: true }), outside)).toBe(false);
    expect(acceptsPlainKey(press('n', { altKey: true }), outside)).toBe(false);
    expect(acceptsPlainKey(press('?', { shiftKey: true }), outside)).toBe(true);
    expect(acceptsPlainKey(press('N', { shiftKey: true }), outside)).toBe(false);
    expect(acceptsPlainKey(press('M', { shiftKey: true }), outside)).toBe(false);
  });

  it('leaves the keys of an IME composition alone', () => {
    expect(isComposing({ isComposing: true, keyCode: 27 })).toBe(true);
    expect(isComposing({ isComposing: false, keyCode: 229 })).toBe(true);
    expect(isComposing({ isComposing: false, keyCode: 27 })).toBe(false);
  });

  it('opens the palette from fields but never inside the drawing editor', () => {
    expect(acceptsPalette({ editable: true, inDrawing: false })).toBe(true);
    expect(acceptsPalette({ editable: false, inDrawing: true })).toBe(false);
  });

  it('reads ⌘ on Apple platforms and Ctrl elsewhere', () => {
    expect(commandKey(press('k', { metaKey: true }), true)).toBe(true);
    expect(commandKey(press('k', { ctrlKey: true }), true)).toBe(false);
    expect(commandKey(press('k', { ctrlKey: true }), false)).toBe(true);
  });
});

describe('G chords', () => {
  function clock() {
    let time = 0;
    return { now: () => time, advance: (ms: number) => (time += ms) };
  }

  it('reads G P, G V, G Q, G L and G 1–9', () => {
    const chords = createChords(clock().now);
    expect(chords.press('g')).toBe('pending');
    expect(chords.press('p')).toEqual({ kind: 'switcher' });
    chords.press('G');
    expect(chords.press('V')).toEqual({ kind: 'overview' });
    chords.press('g');
    expect(chords.press('q')).toEqual({ kind: 'board' });
    chords.press('g');
    expect(chords.press('l')).toEqual({ kind: 'trash' });
    chords.press('g');
    expect(chords.press('3')).toEqual({ kind: 'project', index: 2 });
  });

  it('waits 1.5 s for the second key', () => {
    const time = clock();
    const chords = createChords(time.now);
    chords.press('g');
    time.advance(CHORD_TIMEOUT_MS);
    expect(chords.pending).toBe(true);
    expect(chords.press('v')).toEqual({ kind: 'overview' });
    chords.press('g');
    time.advance(CHORD_TIMEOUT_MS + 1);
    expect(chords.pending).toBe(false);
    expect(chords.press('v')).toBeNull();
  });

  it('ignores keys without a G before, and discards a key after G that completes nothing', () => {
    const chords = createChords(clock().now);
    expect(chords.press('v')).toBeNull();
    expect(chords.press('1')).toBeNull();
    chords.press('g');
    expect(chords.press('n')).toBe('discarded');
    expect(chords.press('v')).toBeNull();
    chords.press('g');
    expect(chords.press('0')).toBe('discarded');
    chords.press('g');
    expect(chords.press('g')).toBe('discarded');
  });
});

describe('Esc layers', () => {
  const plain = { handled: false, editable: false, inDrawing: false };

  it('closes only the most recent layer, one per Esc, down to an empty stack', () => {
    const stack = createLayerStack();
    const closed: string[] = [];
    const layer = (id: string) => ({ id, close: () => closed.push(id) });
    const remove = {
      overlay: stack.open(layer('sidebar-overlay')),
      dialog: stack.open(layer('dialog')),
      palette: stack.open(layer('palette')),
      popover: stack.open(layer('popover')),
    };
    for (const expected of ['popover', 'palette', 'dialog', 'sidebar-overlay']) {
      const action = escapeAction(stack, plain);
      expect(action).toMatchObject({ kind: 'close', layer: { id: expected } });
      if (action.kind === 'close') {
        action.layer.close();
        remove[expected === 'sidebar-overlay' ? 'overlay' : (expected as 'dialog' | 'palette' | 'popover')]();
      }
    }
    expect(closed).toEqual(['popover', 'palette', 'dialog', 'sidebar-overlay']);
    expect(escapeAction(stack, plain)).toEqual({ kind: 'none' });
  });

  it('keeps the order when a layer closes out of order', () => {
    const stack = createLayerStack();
    stack.open({ id: 'overlay', close: () => undefined });
    const removePalette = stack.open({ id: 'palette', close: () => undefined });
    stack.open({ id: 'popover', close: () => undefined });
    removePalette();
    expect(stack.size).toBe(2);
    expect(stack.top()?.id).toBe('popover');
  });

  it('first leaves a text field, and leaves Esc to a component that handled it or to the drawing editor', () => {
    const stack = createLayerStack();
    stack.open({ id: 'search', close: () => undefined });
    expect(escapeAction(stack, { ...plain, editable: true })).toEqual({ kind: 'leave-field' });
    expect(escapeAction(stack, { ...plain, handled: true })).toEqual({ kind: 'none' });
    expect(escapeAction(stack, { ...plain, inDrawing: true })).toEqual({ kind: 'none' });
  });

  it('reopening a layer moves it to the top instead of stacking it twice', () => {
    const stack = createLayerStack();
    stack.open({ id: 'a', close: () => undefined });
    stack.open({ id: 'b', close: () => undefined });
    stack.open({ id: 'a', close: () => undefined });
    expect(stack.size).toBe(2);
    expect(stack.top()?.id).toBe('a');
  });
});
