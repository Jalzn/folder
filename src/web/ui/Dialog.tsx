import './dialog.css';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Dialog as AriaDialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { cx } from '../lib/cx';
import { IconButton } from './IconButton';

export interface DialogProps {
  title: string;
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  className?: string;
  /** Whether Esc and the close button dismiss the dialog. */
  dismissable?: boolean;
  /** Turn off for content that a stray click must not discard. */
  closeOnOutsideClick?: boolean;
}

/** A modal dialog on the scrim, level 3 and radius 12. Esc closes it and only it. */
export function Dialog({
  title,
  children,
  open,
  onClose,
  className,
  dismissable = true,
  closeOnOutsideClick = dismissable,
}: DialogProps) {
  return (
    <ModalOverlay
      className="modal-overlay"
      isOpen={open}
      onOpenChange={(value) => !value && onClose()}
      isDismissable={closeOnOutsideClick}
      isKeyboardDismissDisabled={!dismissable}
    >
      <Modal className={cx('modal', className)}>
        <AriaDialog className="dialog">
          <header className="dialog__header">
            <Heading slot="title" className="dialog__title">
              {title}
            </Heading>
            {dismissable && (
              <IconButton label="Fechar" size="sm" onPress={onClose}>
                <X size={16} />
              </IconButton>
            )}
          </header>
          {children}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}

/** The row of buttons at the end of a dialog, aligned to the right. */
export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="dialog-actions">{children}</div>;
}
