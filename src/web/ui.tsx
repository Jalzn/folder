import { AlertCircle, Check, LoaderCircle, X } from 'lucide-react';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  Menu as AriaMenu,
  Heading,
  MenuItem,
  MenuTrigger,
  Modal,
  ModalOverlay,
  Popover,
} from 'react-aria-components';
import { errorMessage, refreshWorkspace, reportSessionError } from './lib/api';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <svg width="29" height="29" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path d="M8 7h16l9 9v17H8V7Z" fill="currentColor" />
        <path d="M24 7v9h9" style={{ fill: 'var(--accent-solid)' }} />
        <path d="M14 23h13M14 28h8" style={{ stroke: 'var(--bg)' }} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {!compact && (
        <span>
          tinyfold<span className="brand-period">.</span>
        </span>
      )}
    </span>
  );
}

export function Dialog({
  title,
  children,
  open,
  onClose,
  className = '',
  dismissable = true,
  closeOnOutsideClick = dismissable,
}: {
  title: string;
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  className?: string;
  /** Whether Esc and the close button dismiss the dialog. */
  dismissable?: boolean;
  /** Turn off for content that a stray click must not discard. */
  closeOnOutsideClick?: boolean;
}) {
  return (
    <ModalOverlay
      className="modal-overlay"
      isOpen={open}
      onOpenChange={(v) => !v && onClose()}
      isDismissable={closeOnOutsideClick}
      isKeyboardDismissDisabled={!dismissable}
    >
      <Modal className={`modal ${className}`}>
        <AriaDialog className="dialog">
          <div className="dialog-heading">
            <Heading slot="title">{title}</Heading>
            {dismissable && (
              <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar">
                <X size={19} />
              </button>
            )}
          </div>
          {children}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <span className="loading" role="status">
      <LoaderCircle size={18} className="spin" />
      {label}
    </span>
  );
}
export function ErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div className="error-notice" role="alert">
      <AlertCircle size={18} />
      <span>{errorMessage(error)}</span>
      {retry && (
        <button className="text-button" type="button" onClick={retry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
export function EmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}

type Notice = { text: string; kind: 'success' | 'error' };
const ToastContext = createContext<(text: string, kind?: Notice['kind']) => void>(() => undefined);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), notice.kind === 'error' ? 8000 : 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  const notify = useCallback((text: string, kind: Notice['kind'] = 'success') => setNotice({ text, kind }), []);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      {notice && (
        <div className={`toast ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
          {notice.kind === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
          <span>{notice.text}</span>
          <button type="button" aria-label="Dispensar aviso" className="icon-button" onClick={() => setNotice(null)}>
            <X size={15} />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);

export function Menu({
  label,
  trigger,
  items,
}: {
  label: string;
  trigger: ReactNode;
  items: { label: string; icon?: ReactNode; action: () => void; danger?: boolean; disabled?: boolean }[];
}) {
  return (
    <MenuTrigger>
      <AriaButton className="icon-button" aria-label={label}>
        {trigger}
      </AriaButton>
      <Popover className="popover" placement="bottom end">
        <AriaMenu className="action-menu" aria-label={label}>
          {items.map((item) => (
            <MenuItem
              key={item.label}
              textValue={item.label}
              className={`menu-item ${item.danger ? 'danger-text' : ''}`}
              isDisabled={item.disabled ?? false}
              onAction={item.action}
            >
              {item.icon}
              {item.label}
            </MenuItem>
          ))}
        </AriaMenu>
      </Popover>
    </MenuTrigger>
  );
}

export function useRequest() {
  const current = useRef<{ fingerprint: string; id: string } | null>(null);
  return {
    for(input: unknown) {
      const fingerprint = JSON.stringify(input);
      if (current.current?.fingerprint !== fingerprint) current.current = { fingerprint, id: crypto.randomUUID() };
      return current.current.id;
    },
    clear() {
      current.current = null;
    },
  };
}

export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  async function run<T>(work: () => Promise<T>, success?: (value: T) => void): Promise<T | undefined> {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      const value = await work();
      await refreshWorkspace();
      success?.(value);
      return value;
    } catch (error) {
      reportSessionError(error);
      toast(errorMessage(error), 'error');
      await refreshWorkspace();
      return;
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return { busy, run };
}
