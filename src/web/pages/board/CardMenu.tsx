import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import { TASK_STATUSES, type Task, taskStatusLabels } from '../../lib/types';
import { ActionMenu } from '../../ui';

export interface CardMoves {
  /** To another column, at its end. */
  toColumn: (status: Task['status']) => void;
  up?: (() => void) | undefined;
  down?: (() => void) | undefined;
}

/** A card's ⋯: open it, and the moves a keyboard needs, to another column or up and down in its own. */
export function CardMenu({ task, moves, onOpen }: { task: Task; moves: CardMoves; onOpen: () => void }) {
  return (
    <ActionMenu
      label={`Opções de ${task.title}`}
      items={[
        { label: 'Editar tarefa', action: onOpen },
        ...TASK_STATUSES.filter((status) => status !== task.status).map((status) => ({
          label: `Mover para ${taskStatusLabels[status]}`,
          icon: <ArrowRight size={16} />,
          action: () => moves.toColumn(status),
        })),
        { label: 'Mover para cima', icon: <ArrowUp size={16} />, disabled: !moves.up, action: () => moves.up?.() },
        {
          label: 'Mover para baixo',
          icon: <ArrowDown size={16} />,
          disabled: !moves.down,
          action: () => moves.down?.(),
        },
      ]}
    />
  );
}
