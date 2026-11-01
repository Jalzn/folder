import { folderName, folderNameKey } from '@tinyfold/workspace/domain';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { takenText } from '../../folders/folder-text';

/**
 * The name of a folder being created or renamed, in its row (docs/etapas/09-pastas.md, "Criar" and
 * "Renomear"). ↵ saves; Esc gives up; leaving saves a valid name. An empty name gives up, and a name another
 * folder has, ignoring case and accents, says so under the field, or gives up with a toast on leaving. The
 * field keeps every key and press from the tree and the shortcuts.
 */
export function FolderNameField({
  mode,
  initial,
  label,
  taken,
  onSubmit,
  onCancel,
  onTakenOnLeave,
}: {
  /** A rename that keeps the name changes nothing; a new folder may keep "Nova pasta". */
  mode: 'create' | 'rename';
  initial: string;
  label: string;
  /** The other folders of the project, by name. */
  taken: readonly string[];
  onSubmit: (name: string) => Promise<boolean>;
  onCancel: () => void;
  /** Leaving with a taken name: the field goes, and the error becomes a toast. */
  onTakenOnLeave: (message: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);
  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);

  const takenBy = (name: string) => taken.find((other) => folderNameKey(other) === folderNameKey(name));
  async function settle(leaving: boolean) {
    if (done.current) return;
    const name = folderName(value);
    if (!name) {
      done.current = true;
      onCancel();
      return;
    }
    const other = takenBy(name);
    if (other) {
      if (leaving) {
        done.current = true;
        onTakenOnLeave(takenText(other));
      } else setError(takenText(other));
      return;
    }
    if (mode === 'rename' && name === initial) {
      done.current = true;
      onCancel();
      return;
    }
    done.current = true;
    if (!(await onSubmit(name))) done.current = false;
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    event.stopPropagation();
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      void settle(false);
    } else if (event.key === 'Escape') {
      // The field's own Esc: the global listener sees it handled and closes nothing else.
      event.preventDefault();
      done.current = true;
      onCancel();
    }
  }
  return (
    <span className="folder-field">
      <input
        ref={input}
        className="folder-field__input"
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        value={value}
        maxLength={200}
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
        <span id={errorId} className="folder-field__error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
