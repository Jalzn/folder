import type { ReactNode } from 'react';
import type { ItemType } from '../../lib/types';
import { AlertDialog, TrashDialog } from '../../ui';
import { itemWords } from './item-words';

interface ConfirmProps {
  type: ItemType;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** "Mover o documento para a lixeira?", the same for a drawing; `children` adds what else stays. */
export function TrashItemDialog({
  type,
  open,
  pending,
  onClose,
  onConfirm,
  children,
}: ConfirmProps & { pending: boolean; children?: ReactNode }) {
  const words = itemWords[type];
  return (
    <TrashDialog
      subject={words.the}
      restore={words.this}
      open={open}
      pending={pending}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      {children}
    </TrashDialog>
  );
}

/** "Carregar a versão salva?" after a conflict, pointing to the copy that keeps both versions. */
export function ReloadDialog({ open, onClose, onConfirm }: Omit<ConfirmProps, 'type'>) {
  return (
    <AlertDialog
      open={open}
      title="Carregar a versão salva?"
      confirmLabel="Carregar versão salva"
      destructive={false}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <p>
        Isso substitui o rascunho desta aba. Para guardar as duas versões, cancele e escolha “Salvar meu rascunho como
        cópia”.
      </p>
    </AlertDialog>
  );
}
