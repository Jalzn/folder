import type { TrashItem } from '../../../lib/queries';
import { AlertDialog } from '../../../ui';
import { emptyTrashBody } from './trash-text';
import { type Confirmation, type PurgeTarget, trashTitle } from './use-trash-actions';

/** "Excluir de vez “<título>”?", saying that a document's tasks stay when it had any. */
export function PurgeDialog({
  confirmation,
  pending,
  onConfirm,
  onClose,
}: {
  confirmation: Confirmation<PurgeTarget> | null;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const target = confirmation?.value;
  return (
    <AlertDialog
      open={confirmation?.open ?? false}
      title={target ? `Excluir de vez “${trashTitle(target.item)}”?` : ''}
      confirmLabel="Excluir de vez"
      isPending={pending}
      onConfirm={onConfirm}
      onClose={onClose}
    >
      <p>
        Não dá para desfazer.
        {target?.originated && ' Tarefas que nasceram deste documento continuam, com o trecho guardado.'}
      </p>
    </AlertDialog>
  );
}

/** "Esvaziar a lixeira de <projeto>?", counting the items it deletes. */
export function EmptyTrashDialog({
  projectName,
  confirmation,
  pending,
  onConfirm,
  onClose,
}: {
  projectName: string;
  confirmation: Confirmation<TrashItem[]> | null;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AlertDialog
      open={confirmation?.open ?? false}
      title={`Esvaziar a lixeira de ${projectName}?`}
      confirmLabel="Esvaziar lixeira"
      isPending={pending}
      onConfirm={onConfirm}
      onClose={onClose}
    >
      <p>{emptyTrashBody(confirmation?.value.length ?? 0)}</p>
    </AlertDialog>
  );
}
