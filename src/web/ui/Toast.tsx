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

interface QueuedToast {
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
 * One toast at a time, the others queued, at the bottom right of the content area. Each stays 6 s, paused
 * while the pointer or the focus is on it. Success is a status and failure an alert.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueuedToast[]>([]);
  const nextId = useRef(0);
  const notify = useCallback<Notify>((text, options) => {
    const { kind = 'success', action } = typeof options === 'string' ? { kind: options } : (options ?? {});
    const id = nextId.current++;
    setQueue((current) => [...current, { id, text, kind, action }]);
  }, []);
  const remove = useCallback((id: number) => setQueue((current) => current.filter((toast) => toast.id !== id)), []);
  const current = queue[0];
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast-region">{current && <Toast key={current.id} toast={current} onRemove={remove} />}</div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onRemove }: { toast: QueuedToast; onRemove: (id: number) => void }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const remaining = useRef(VISIBLE_MS);
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

  const blur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  };
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Hover and focus only pause the timer; the action is a button.
    <div
      className="toast"
      role={toast.kind === 'error' ? 'alert' : 'status'}
      data-kind={toast.kind}
      data-leaving={leaving || undefined}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={blur}
    >
      <span className="toast__text">{toast.text}</span>
      {toast.action && (
        <button
          type="button"
          className="toast__action"
          onClick={() => {
            toast.action?.onAction();
            leave();
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
