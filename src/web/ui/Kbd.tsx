import './kbd.css';
import { isModifierKey, keyLabel, usesCommandKey } from '../lib/platform';

/**
 * The shortcut as it reads on a key cap and in a tooltip: "⌘K", "⌘⌥T", "⇧F6" on Apple platforms, "Ctrl+K",
 * "Ctrl+Alt+T", "Shift+F6" elsewhere (review B9); a sequence as "G P".
 */
export function shortcutLabel(keys: readonly string[]) {
  const joined = usesCommandKey() ? '' : '+';
  return keys.reduce((label, key, index) => {
    const previous = keys[index - 1];
    const separator = index === 0 ? '' : previous && isModifierKey(previous) ? joined : ' ';
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
