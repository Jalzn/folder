import { type FocusEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Focusable } from 'react-aria-components';
import { usesCommandKey } from '../lib/platform';
import { shortcutLabel } from './Kbd';
import { Tooltip, TooltipTrigger } from './Tooltip';
import { actFromToast } from './toast-focus';

export type ToastKind = 'success' | 'error';
export interface ToastAction {
  label: string;
  /** May return the work it starts, such as an undo, so the focus is checked again once it is done. */
  onAction: () => unknown;
}

/** A toast on screen. */
export interface ShownToast {
  id: number;
  text: string;
  kind: ToastKind;
  action?: ToastAction | undefined;
  undo?: (() => unknown) | undefined;
  undoLabel: string;
}

const VISIBLE_MS = 6000;
const LEAVING_MS = 140;

/**
 * One toast: its text, Desfazer (with ⌘Z in its tooltip) and its action. It stays 6 s, paused while the
 * pointer or the focus is on it, then leaves; an action closes it and gives the focus back.
 */
export function ToastCard({
  toast,
  onLeaving,
  onRemove,
}: {
  toast: ShownToast;
  onLeaving: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const remaining = useRef(VISIBLE_MS);
  const element = useRef<HTMLDivElement>(null);
  // Where focus was before it came into the toast, to go back there after the action.
  const returnTo = useRef<HTMLElement | null>(null);
  const leave = useCallback(() => {
    setLeaving(true);
    onLeaving(toast.id);
  }, [onLeaving, toast.id]);

  useEffect(() => {
    if (hovered || focused || leaving) return;
    const started = Date.now();
    const timer = setTimeout(leave, remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - started;
    };
  }, [hovered, focused, leaving, leave]);
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => onRemove(toast.id), LEAVING_MS);
    return () => clearTimeout(timer);
  }, [leaving, onRemove, toast.id]);

  function act(work: (() => unknown) | undefined) {
    const inToast = element.current?.contains(document.activeElement) ?? false;
    actFromToast(
      () => {
        const done = work?.();
        leave();
        return done;
      },
      inToast,
      returnTo.current,
    );
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Hover and focus only pause the timer; the actions are buttons.
    <div
      ref={element}
      className="toast"
      data-kind={toast.kind}
      data-leaving={leaving || undefined}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={(event: FocusEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          returnTo.current = event.relatedTarget instanceof HTMLElement ? event.relatedTarget : null;
        setFocused(true);
      }}
      onBlur={(event: FocusEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <span className="toast__text">{toast.text}</span>
      {toast.undo && (
        <TooltipTrigger delay={600} closeDelay={0}>
          <Focusable>
            <button
              type="button"
              className="toast__action"
              aria-keyshortcuts={usesCommandKey() ? 'Meta+Z' : 'Control+Z'}
              onClick={() => act(toast.undo)}
            >
              {toast.undoLabel}
            </button>
          </Focusable>
          <Tooltip>
            {toast.undoLabel}
            <span className="tooltip__keys">{shortcutLabel(['mod', 'Z'])}</span>
          </Tooltip>
        </TooltipTrigger>
      )}
      {toast.action && (
        <button type="button" className="toast__action" onClick={() => act(toast.action?.onAction)}>
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
