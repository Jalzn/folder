import { displayName, nameKey } from '@tinyfold/workspace/domain';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { whenPresent } from '../../ui';

/** "Já existe uma coluna Revisão." */
export const columnTakenText = (name: string) => `Já existe uma coluna ${name}.`;

/**
 * A column's name being edited in its header (docs/etapas/10-quadro-tarefa.md, "Renomear"): ↵ or leaving saves,
 * Esc gives the name back. An empty name, or the same one, changes nothing; a name another column has,
 * ignoring case and accents, says so under the field, and leaving then gives the name back. The field keeps
 * its keys from the board and the shortcuts.
 */
export function ColumnNameField({
  initial,
  taken,
  onSubmit,
  onDone,
}: {
  initial: string;
  /** The other columns, by name. */
  taken: readonly string[];
  onSubmit: (name: string) => Promise<boolean>;
  /** The field leaves, saved or not. */
  onDone: () => void;
}) {
  const errorId = useId();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const settled = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const field = input.current;
    if (!field) return;
    // From the ⋯ menu's Renomear, the page stays inert until the menu has closed, which refuses autoFocus:
    // the field takes the focus once it can.
    const take = () => {
      if (document.activeElement !== field) field.focus();
      return document.activeElement === field ? field : null;
    };
    if (take()) return;
    return whenPresent(take, () => undefined, { frames: 20 });
  }, []);
  const takenBy = (name: string) => taken.find((other) => nameKey(other) === nameKey(name));

  async function settle(leaving: boolean) {
    if (settled.current) return;
    const name = displayName(value);
    const other = name ? takenBy(name) : undefined;
    if (other && !leaving) {
      setError(columnTakenText(other));
      return;
    }
    settled.current = true;
    if (!name || other || name === initial) return onDone();
    if (await onSubmit(name)) onDone();
    else settled.current = false;
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    event.stopPropagation();
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      void settle(false);
    } else if (event.key === 'Escape') {
      // The field's own Esc: the shortcuts see it handled and close nothing else.
      event.preventDefault();
      settled.current = true;
      onDone();
    }
  }
  return (
    <span className="column-name-field">
      <input
        ref={input}
        className="column-name-field__input"
        aria-label="Nome da coluna"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        value={value}
        maxLength={200}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => {
          setValue(event.target.value);
          setError(null);
        }}
        onKeyDown={keyDown}
        onKeyUp={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onBlur={() => void settle(true)}
      />
      {error && (
        <span id={errorId} className="column-name-field__error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
