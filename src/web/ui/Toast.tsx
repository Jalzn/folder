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
import { focusPageTitle } from './PageHeader';

export type ToastKind = 'success' | 'error';
export interface ToastAction {
  label: string;
  onAction: () => void;
}
export interface ToastOptions {
  kind?: ToastKind;
  /** One action, such as "Desfazer"; using it closes the toast. */
  action?: ToastAction;
}
/** Shows a toast; `'error'` is short for `{ kind: 'error' }`. */
export type Notify = (text: string, options?: ToastKind | ToastOptions) => void;

interface ShownToast {
  id: number;
  text: string;
  kind: ToastKind;
  action?: ToastAction | undefined;
}

const VISIBLE_MS = 6000;
const LEAVING_MS = 140;

const ToastContext = createContext<Notify>(() => undefined);

export const useToast = () => useContext(ToastContext);

/**
 * The latest toast, at the bottom right of the content area: a new one replaces the one on screen, so the
 * Desfazer of the last action is always at hand. It stays 6 s, paused while the pointer or the focus is on
 * it. It shows inside one of two live regions mounted once, status for success and alert for failure, so
 * each toast is a change a screen reader announces; the regions stay readable while a modal is open.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ShownToast | null>(null);
  const nextId = useRef(0);
  const notify = useCallback<Notify>((text, options) => {
    const { kind = 'success', action } = typeof options === 'string' ? { kind: options } : (options ?? {});
    setCurrent({ id: nextId.current++, text, kind, action });
  }, []);
  const remove = useCallback((id: number) => setCurrent((shown) => (shown?.id === id ? null : shown)), []);
  const toast = (kind: ToastKind) =>
    current?.kind === kind && <Toast key={current.id} toast={current} onRemove={remove} />;
  return (
    <ToastContext.Provider value={notify}>
      {children}
      {/* React Aria leaves elements marked as top layer readable while a modal hides the rest. */}
      <div className="toast-region" data-react-aria-top-layer="true">
        <div role="status">{toast('success')}</div>
        <div role="alert">{toast('error')}</div>
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onRemove }: { toast: ShownToast; onRemove: (id: number) => void }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const remaining = useRef(VISIBLE_MS);
  const element = useRef<HTMLDivElement>(null);
  // Where focus was before it came into the toast, to go back there after the action.
  const returnTo = useRef<HTMLElement | null>(null);
  const leave = useCallback(() => setLeaving(true), []);

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

  function act() {
    const hadFocus = element.current?.contains(document.activeElement) ?? false;
    toast.action?.onAction();
    leave();
    if (!hadFocus) return;
    const back = returnTo.current;
    if (back?.isConnected) back.focus();
    else focusPageTitle();
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Hover and focus only pause the timer; the action is a button.
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
      {toast.action && (
        <button type="button" className="toast__action" onClick={act}>
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
