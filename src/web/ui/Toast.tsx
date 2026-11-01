import './toast.css';
import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { type ShownToast, type ToastAction, ToastCard, type ToastKind } from './ToastCard';
import { refocusAfter } from './toast-focus';
import { createUndoSlot } from './toast-undo';

export type { ToastAction, ToastKind } from './ToastCard';

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

const ToastContext = createContext<Notify>(() => undefined);
const UndoContext = createContext<() => boolean>(() => false);

export const useToast = () => useContext(ToastContext);

/** Runs the undo of the toast on screen and closes it; false when it offers none. */
export const useUndoLatest = () => useContext(UndoContext);

/**
 * The latest toast, at the bottom right of the content area: a new one replaces the one on screen, so the
 * Desfazer of the last action is always at hand, and ⌘Z runs it (ToastCard.tsx draws it). It shows inside one
 * of two live regions mounted once, status for success and alert for failure, so each toast is a change a
 * screen reader announces; the regions stay readable while a modal is open.
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
    current?.kind === kind && <ToastCard key={current.id} toast={current} onLeaving={leaving} onRemove={remove} />;
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
