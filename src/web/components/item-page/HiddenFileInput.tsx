import type { RefObject } from 'react';

/**
 * The file field an item's import opens from its menus, hidden: it has nothing to show, so it stays out of the
 * Tab order (review B11, decision 7).
 */
export function HiddenFileInput({
  inputRef,
  accept,
  label,
  onFile,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  accept: string;
  label: string;
  onFile: (file: File) => void;
}) {
  return (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      className="sr-only"
      tabIndex={-1}
      aria-label={label}
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) onFile(file);
      }}
    />
  );
}
