import './kbd.css';
import { keyLabel } from '../lib/platform';

const modifiers = new Set(['mod', '⇧', '⌥']);

/** The shortcut as it reads on a key cap and in a tooltip: "⌘K", "⇧F6", "G P". */
export function shortcutLabel(keys: readonly string[]) {
  return keys.reduce((label, key, index) => {
    const previous = keys[index - 1];
    const separator = index === 0 || (previous && modifiers.has(previous)) ? '' : ' ';
    return `${label}${separator}${keyLabel(key)}`;
  }, '');
}

/** A key cap. `mod` shows ⌘ on Apple platforms and Ctrl elsewhere. */
export function Kbd({ children }: { children: string }) {
  return <kbd className="kbd">{keyLabel(children)}</kbd>;
}

/** A shortcut on one key cap, as the prototype draws them: `['mod', 'K']` reads ⌘K, `['G', 'P']` G P. */
export function Shortcut({ keys }: { keys: readonly string[] }) {
  return <kbd className="kbd">{shortcutLabel(keys)}</kbd>;
}
