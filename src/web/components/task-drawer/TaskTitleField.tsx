import { type KeyboardEvent, type RefObject, useLayoutEffect, useRef } from 'react';
import { holdFocus } from './hold-focus';

/**
 * The drawer's title, 20/28 600 on one line. It keeps its own keys: ↵ calls `onEnter` (create, or leave the
 * title), and Esc leaves the field for the drawer, which a second Esc closes. Nothing else of the drawer or
 * the page acts on a key typed here.
 */
export function TaskTitleField({
  value,
  label,
  placeholder,
  readOnly = false,
  autoFocus = false,
  invalid = false,
  describedBy,
  field,
  drawer,
  onChange,
  onEnter,
  onLeave,
  onBlur,
}: {
  value: string;
  label: string;
  placeholder?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
  invalid?: boolean;
  describedBy?: string | undefined;
  field?: RefObject<HTMLTextAreaElement | null>;
  /** The drawer: a focus that moves within it, as an Esc out of the field, is never taken back. */
  drawer: RefObject<HTMLElement | null>;
  onChange: (value: string) => void;
  onEnter: () => void;
  /** Esc: the focus goes to the drawer. */
  onLeave: () => void;
  onBlur?: () => void;
}) {
  const own = useRef<HTMLTextAreaElement>(null);
  const ref = field ?? own;
  useLayoutEffect(() => {
    if (!autoFocus) return;
    const element = ref.current;
    if (!element) return;
    return holdFocus(
      element,
      () => drawer.current,
      () => {
        element.focus();
        element.setSelectionRange(element.value.length, element.value.length);
      },
    );
  }, [autoFocus, ref, drawer]);
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    const mod = event.metaKey || event.ctrlKey;
    if (event.key === 'Enter' && !mod && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      onEnter();
    } else if (event.key === 'Escape') {
      // The field's own Esc: the shell's listener sees it handled and closes nothing.
      event.preventDefault();
      event.stopPropagation();
      onLeave();
    }
  }
  return (
    <textarea
      ref={ref}
      className="task-drawer__title"
      aria-label={label}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      placeholder={placeholder}
      value={value}
      readOnly={readOnly}
      rows={1}
      wrap="off"
      spellCheck={false}
      maxLength={300}
      onChange={(event) => onChange(event.target.value.replace(/\n/g, ' '))}
      onKeyDown={keyDown}
      onBlur={onBlur}
    />
  );
}
