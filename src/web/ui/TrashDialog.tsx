import type { ReactNode } from 'react';
import { AlertDialog } from './AlertDialog';

/** A reversible move to the trash, with the host's note about linked content. */
export function TrashDialog({
  subject,
  restore = subject,
  open,
  pending,
  onClose,
  onConfirm,
  children,
}: {
  subject: string;
  restore?: string;
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  return (
    <AlertDialog
      open={open}
      title={`Mover ${subject} para a lixeira?`}
      confirmLabel="Mover para a lixeira"
      isPending={pending}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <p>
        Você pode restaurar {restore} depois.{children && <> {children}</>}
      </p>
    </AlertDialog>
  );
}
