import type { RefObject } from 'react';

/**
 * The file field an item's import opens from its menus, hidden: it has nothing to show, so it stays out of the
 * Tab order (review B11), unless `tabbable` keeps it in.
 */
export function HiddenFileInput({
  inputRef,
  accept,
  label,
  onFile,
  tabbable = false,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  accept: string;
  label: string;
  onFile: (file: File) => void;
  tabbable?: boolean;
}) {
  return (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      className="sr-only"
      {...(tabbable ? {} : { tabIndex: -1 })}
      aria-label={label}
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) onFile(file);
      }}
    />
  );
}
