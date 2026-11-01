import './dialog.css';
import { type ReactNode, useId } from 'react';
import { Dialog as AriaDialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { Button } from './Button';

export interface AlertDialogProps {
  title: string;
  children?: ReactNode;
  open: boolean;
  onClose: () => void;
  confirmLabel: string;
  onConfirm: () => void;
  cancelLabel?: string;
  /** A destructive action takes the danger button. */
  destructive?: boolean;
  isPending?: boolean;
  /** Where the focus starts: on Cancelar, or on a choice of the body that takes it, as a radio. */
  initialFocus?: 'cancel' | 'body';
}

/**
 * A confirmation before an action: Cancelar has the initial focus, so Enter never confirms by accident, unless
 * the body holds a choice that takes it.
 */
export function AlertDialog({
  title,
  children,
  open,
  onClose,
  confirmLabel,
  onConfirm,
  cancelLabel = 'Cancelar',
  destructive = true,
  isPending = false,
  initialFocus = 'cancel',
}: AlertDialogProps) {
  const bodyId = useId();
  return (
    <ModalOverlay className="modal-overlay" isOpen={open} onOpenChange={(value) => !value && onClose()} isDismissable>
      <Modal className="modal">
        <AriaDialog
          role="alertdialog"
          className="dialog"
          // The body is what the person must read before confirming: "Não dá para desfazer."
          {...(children ? { 'aria-describedby': bodyId } : {})}
        >
          <header className="dialog__header">
            <Heading slot="title" className="dialog__title">
              {title}
            </Heading>
          </header>
          {children && (
            <div id={bodyId} className="dialog__body">
              {children}
            </div>
          )}
          <div className="dialog-actions">
            <Button autoFocus={initialFocus === 'cancel'} onPress={onClose}>
              {cancelLabel}
            </Button>
            <Button variant={destructive ? 'danger' : 'primary'} isPending={isPending} onPress={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
