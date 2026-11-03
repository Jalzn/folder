import type { Confirmation } from '../../../lib/react/use-confirmation';
import { AlertDialog } from '../../../ui';
import { emptyTrashBody, emptyTrashTitle } from './trash-text';
import { type EmptyTarget, type PurgeTarget, trashTitle } from './use-trash-actions';

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
 * "Esvaziar a lixeira de <projeto>?", counting the items it deletes; when only part of the trash is shown,
 * "Excluir de vez os 3 itens mostrados?", since the others stay.
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
  const shown = confirmation?.value.items.length ?? 0;
  const partial = confirmation?.value.partial ?? false;
  return (
    <AlertDialog
      open={confirmation?.open ?? false}
      title={emptyTrashTitle(shown, partial, projectName)}
      confirmLabel={partial ? 'Excluir de vez' : 'Esvaziar lixeira'}
      isPending={pending}
      onConfirm={onConfirm}
      onClose={onClose}
    >
      <p>{emptyTrashBody(shown, partial)}</p>
    </AlertDialog>
  );
}
