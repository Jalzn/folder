import { AlertDialog } from '../../ui';
import { deleteWithItemsTitle } from './folder-text';

/** "Excluir “MCP” e 1 item?": the items go to the trash, from where they can come back. */
export function DeleteFolderDialog({
  folder,
  open,
  pending,
  onConfirm,
  onClose,
}: {
  folder: { name: string; total: number } | null;
  open: boolean;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AlertDialog
      open={open}
      title={folder ? deleteWithItemsTitle(folder.name, folder.total) : ''}
      confirmLabel="Excluir pasta e itens"
      isPending={pending}
      onConfirm={onConfirm}
      onClose={onClose}
    >
      <p>Os itens vão para a Lixeira e podem ser restaurados por lá. A pasta deixa de existir.</p>
    </AlertDialog>
  );
}
