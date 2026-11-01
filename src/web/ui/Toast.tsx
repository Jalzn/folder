import './toast.css';
import {
  createContext,
  type FocusEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Focusable } from 'react-aria-components';
import { usesCommandKey } from '../lib/platform';
import { focusPageTitle } from './focus';
import { shortcutLabel } from './Kbd';
import { Tooltip, TooltipTrigger } from './Tooltip';
import { createUndoSlot } from './toast-undo';

export type ToastKind = 'success' | 'error';
export interface ToastAction {
  label: string;
  /** May return the work it starts, such as an undo, so the focus is checked again once it is done. */
  onAction: () => unknown;
}
export interface ToastOptions {
  kind?: ToastKind;
  /** One action, such as "Abrir"; using it closes the toast. */
  action?: ToastAction;
  /** Undoes what the toast reports: its button, and ⌘Z while the toast is on screen. */
  undo?: () => unknown;
  /** The undo's label: "Desfazer", or one that says what it does, such as "Desarquivar". */
  undoLabel?: string;
}
/** Shows a toast; `'error'` is short for `{ kind: 'error' }`. */
export type Notify = (text: string, options?: ToastKind | ToastOptions) => void;

interface ShownToast {
  id: number;
  text: string;
  kind: ToastKind;
  action?: ToastAction | undefined;
  undo?: (() => unknown) | undefined;
  undoLabel: string;
}

const VISIBLE_MS = 6000;
const LEAVING_MS = 140;

const ToastContext = createContext<Notify>(() => undefined);
const UndoContext = createContext<() => boolean>(() => false);

export const useToast = () => useContext(ToastContext);

/** Runs the undo of the toast on screen and closes it; false when it offers none. */
export const useUndoLatest = () => useContext(UndoContext);

/** Once work an action started settles, a focus it left on nothing goes to the page's title. */
const refocusAfter = (done: unknown) =>
  void Promise.resolve(done)
    .catch(() => undefined)
    .then(() => focusPageTitle());

/**
 * The latest toast, at the bottom right of the content area: a new one replaces the one on screen, so the
 * Desfazer of the last action is always at hand, and ⌘Z runs it. It stays 6 s, paused while the pointer or
 * the focus is on it. It shows inside one of two live regions mounted once, status for success and alert
 * for failure, so each toast is a change a screen reader announces; the regions stay readable while a modal
 * is open.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ShownToast | null>(null);
  const [slot] = useState(createUndoSlot);
  const nextId = useRef(0);
  const notify = useCallback<Notify>(
    (text, options) => {
      const {
        kind = 'success',
        action,
        undo,
        undoLabel = 'Desfazer',
      } = typeof options === 'string' ? { kind: options } : (options ?? {});
      const id = nextId.current++;
      slot.show(id, undo);
      setCurrent({ id, text, kind, action, undo, undoLabel });
    },
    [slot],
  );
  const undoLatest = useCallback(() => {
    const id = slot.offeredBy();
    const undo = slot.take();
    if (!undo) return false;
    setCurrent((shown) => (shown?.id === id ? null : shown));
    refocusAfter(undo());
    return true;
  }, [slot]);
  const remove = useCallback((id: number) => setCurrent((shown) => (shown?.id === id ? null : shown)), []);
  const leaving = useCallback((id: number) => slot.leave(id), [slot]);
  const toast = (kind: ToastKind) =>
    current?.kind === kind && <Toast key={current.id} toast={current} onLeaving={leaving} onRemove={remove} />;
  return (
    <ToastContext.Provider value={notify}>
      <UndoContext.Provider value={undoLatest}>
        {children}
        {/* React Aria leaves elements marked as top layer readable while a modal hides the rest. */}
        <div className="toast-region" data-react-aria-top-layer="true">
          <div role="status">{toast('success')}</div>
          <div role="alert">{toast('error')}</div>
        </div>
      </UndoContext.Provider>
    </ToastContext.Provider>
  );
}

function Toast({
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
    const hadFocus = element.current?.contains(document.activeElement) ?? false;
    const done = work?.();
    leave();
    if (!hadFocus) return;
    const back = returnTo.current;
    if (back?.isConnected) back.focus();
    else focusPageTitle();
    // The work may take that element away once it is done, as an undo that moves a row's item out of the
    // project: the focus then goes to the page's title, which only happens when it was lost.
    refocusAfter(done);
  }
  const undoKeys = ['mod', 'Z'];
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
            <span className="tooltip__keys">{shortcutLabel(undoKeys)}</span>
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
