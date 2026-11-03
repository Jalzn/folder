import type { Task } from '../../lib/types';
import { TrashDialog } from '../../ui';

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
    <TrashDialog subject="a tarefa" open={open} pending={pending} onClose={onClose} onConfirm={onConfirm}>
      {task.source ? 'O trecho do documento continua lá.' : null}
    </TrashDialog>
  );
}
