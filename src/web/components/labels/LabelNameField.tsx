import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { InlineNameField, whenPresent } from '../../ui';
import { checkLabelName } from './label-name';

/** How the field left: by ↵ or Esc, so the focus goes back to its row, or by leaving, which already moved it. */
export type LabelFieldExit = 'key' | 'leave';

/**
 * A label's name being typed in its row of "Etiquetas" (docs/etapas/10-quadro-tarefa.md, "Etiquetas"), to
 * rename it or, from "+ Nova etiqueta", to create one: ↵ or leaving saves, Esc gives up. An empty name, or the
 * same one, changes nothing; a name too long, or one another label has ignoring case and accents, says so
 * under the field, and leaving then gives up. The field keeps its keys from the dialog and the shortcuts, Esc
 * included, but Tab, which the dialog keeps inside it.
 */
export function LabelNameField({
  initial,
  label,
  taken,
  onSubmit,
  onDone,
}: {
  /** The current name, or '' for a new label. */
  initial: string;
  /** The field's accessible name. */
  label: string;
  /** The other labels, by name. */
  taken: readonly string[];
  /** Resolves to whether the write went through; the field stays while it does not. */
  onSubmit: (name: string) => Promise<boolean>;
  /** The field leaves, saved or not. */
  onDone: (exit: LabelFieldExit) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const settled = useRef(false);
  useEffect(() => {
    const field = input.current;
    if (!field) return;
    // Wait until the closing menu releases inertness.
    const take = () => {
      if (document.activeElement !== field) field.focus();
      return document.activeElement === field ? field : null;
    };
    if (take()) return;
    return whenPresent(take, () => undefined, { frames: 10 });
  }, []);

  async function settle(exit: LabelFieldExit) {
    if (settled.current) return;
    const check = checkLabelName(value, initial, taken);
    if (check.kind === 'error' && exit === 'key') {
      setError(check.text);
      return;
    }
    settled.current = true;
    if (check.kind !== 'ok') return onDone(exit);
    if (await onSubmit(check.name)) onDone(exit);
    else settled.current = false;
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Tab') return;
    event.stopPropagation();
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      void settle('key');
    } else if (event.key === 'Escape') {
      // The field's own Esc: the dialog and the shortcuts see it handled and close nothing.
      event.preventDefault();
      settled.current = true;
      onDone('key');
    }
  }
  return (
    <InlineNameField
      className="label-name-field"
      error={error}
      input={{
        ref: input,
        'aria-label': label,
        value: value,
        placeholder: 'Nome da etiqueta',
        maxLength: 200,
        autoComplete: 'off',
        'data-1p-ignore': true,
        'data-lpignore': 'true',
        onFocus: (event) => event.currentTarget.select(),
        onChange: (event) => {
          setValue(event.target.value);
          setError(null);
        },
        onKeyDown: keyDown,
        onKeyUp: (event) => event.stopPropagation(),
        onPointerDown: (event) => event.stopPropagation(),
        onClick: (event) => event.stopPropagation(),
        onBlur: () => void settle('leave'),
      }}
    />
  );
}
