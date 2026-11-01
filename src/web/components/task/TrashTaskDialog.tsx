import type { Task } from '../../lib/types';
import { AlertDialog } from '../../ui';

/** "Mover a tarefa para a lixeira?", from the drawer or a card's ⋯: it can come back from the trash. */
export function TrashTaskDialog({
  task,
  open = true,
  pending,
  onConfirm,
  onClose,
}: {
  task: Pick<Task, 'source'>;
  open?: boolean;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AlertDialog
      open={open}
      title="Mover a tarefa para a lixeira?"
      confirmLabel="Mover para a lixeira"
      isPending={pending}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <p>Você pode restaurar a tarefa depois.{task.source && ' O trecho do documento continua lá.'}</p>
    </AlertDialog>
  );
}
