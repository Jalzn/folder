/** Whether shortcuts use ⌘ (Apple platforms) or Ctrl. */
export function usesCommandKey() {
  if (typeof navigator === 'undefined') return false;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform;
  return /mac|iphone|ipad|ipod/i.test(platform || navigator.userAgent);
}

/** The modifiers by their Apple symbols, as the shortcuts name them, and their names elsewhere. */
const MODIFIERS: Record<string, [apple: string, other: string]> = {
  mod: ['⌘', 'Ctrl'],
  alt: ['⌥', 'Alt'],
  '⌥': ['⌥', 'Alt'],
  '⇧': ['⇧', 'Shift'],
};

/** Whether a shortcut key is a modifier: `mod`, `alt` (or ⌥) and ⇧. */
export const isModifierKey = (key: string) => key in MODIFIERS;

/**
 * The label of a shortcut key: `mod` is ⌘ on Apple platforms and Ctrl elsewhere, `alt` ⌥ or Alt, ⇧ ⇧ or Shift.
 */
export function keyLabel(key: string) {
  const names = MODIFIERS[key];
  if (!names) return key;
  return usesCommandKey() ? names[0] : names[1];
}
