import { afterEach, describe, expect, it, vi } from 'vitest';
import { shortcutLabel } from './Kbd';

const on = (platform: string) => vi.stubGlobal('navigator', { platform, userAgent: '' });

describe('shortcutLabel', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('writes the modifiers as symbols, side by side, on Apple platforms', () => {
    on('MacIntel');
    expect(shortcutLabel(['mod', 'alt', 'T'])).toBe('⌘⌥T');
    expect(shortcutLabel(['mod', 'K'])).toBe('⌘K');
    expect(shortcutLabel(['⇧', 'F6'])).toBe('⇧F6');
    expect(shortcutLabel(['G', 'P'])).toBe('G P');
  });

  it('writes them by name, joined by +, elsewhere: Ctrl+Alt+T, never Ctrl⌥T', () => {
    on('Win32');
    expect(shortcutLabel(['mod', 'alt', 'T'])).toBe('Ctrl+Alt+T');
    expect(shortcutLabel(['mod', '⌥', 'T'])).toBe('Ctrl+Alt+T');
    expect(shortcutLabel(['mod', 'K'])).toBe('Ctrl+K');
    expect(shortcutLabel(['⇧', 'F6'])).toBe('Shift+F6');
    expect(shortcutLabel(['G', 'P'])).toBe('G P');
  });
});
