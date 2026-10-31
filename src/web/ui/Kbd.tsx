import './kbd.css';
import { keyLabel } from '../lib/platform';

/** A key cap. `mod` shows ⌘ on Apple platforms and Ctrl elsewhere. */
export function Kbd({ children }: { children: string }) {
  return <kbd className="kbd">{keyLabel(children)}</kbd>;
}

/** A shortcut as a row of keys, such as `['mod', 'K']` or `['G', 'P']`. */
export function Shortcut({ keys }: { keys: readonly string[] }) {
  return (
    <span className="shortcut">
      {keys.map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
    </span>
  );
}

/** The shortcut as screen readers and tooltips say it: "⌘ K". */
export function shortcutLabel(keys: readonly string[]) {
  return keys.map(keyLabel).join(' ');
}
