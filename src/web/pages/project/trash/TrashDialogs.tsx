import { AlertDialog } from '../../../ui';
import { emptyTrashBody } from './trash-text';
import { type Confirmation, type EmptyTarget, type PurgeTarget, trashTitle } from './use-trash-actions';

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
        {target?.originated &&
          ' Tarefas que nasceram deste documento continuam, com o título do documento e o trecho guardados.'}
      </p>
    </AlertDialog>
  );
}

/**
 * "Esvaziar a lixeira de <projeto>?", counting the items it deletes; with a filter on, "Excluir de vez os
 * itens mostrados?", since the others stay.
 */
export function EmptyTrashDialog({
  projectName,
  confirmation,
  pending,
  onConfirm,
  onClose,
}: {
  projectName: string;
  confirmation: Confirmation<EmptyTarget> | null;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AlertDialog
      open={confirmation?.open ?? false}
      title={
        confirmation?.value.filtered ? 'Excluir de vez os itens mostrados?' : `Esvaziar a lixeira de ${projectName}?`
      }
      confirmLabel={confirmation?.value.filtered ? 'Excluir de vez' : 'Esvaziar lixeira'}
      isPending={pending}
      onConfirm={onConfirm}
      onClose={onClose}
    >
      <p>{emptyTrashBody(confirmation?.value.items.length ?? 0, confirmation?.value.filtered ?? false)}</p>
    </AlertDialog>
  );
}
