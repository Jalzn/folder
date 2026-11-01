import { Plus } from 'lucide-react';
import { formatCount } from '../../lib/count';
import { TASK_STATUSES, type TaskStatus, taskStatusLabels } from '../../lib/types';
import { ColumnRing, IconButton } from '../../ui';

/** A column's 28 px header: the ring, the name, the count and, where tasks can be added, its "+". */
export function ColumnHeader({
  status,
  index,
  count,
  onAdd,
}: {
  status: TaskStatus;
  index: number;
  count: number;
  onAdd?: (() => void) | undefined;
}) {
  const label = taskStatusLabels[status];
  return (
    <header className="kanban-column__header">
      <ColumnRing index={index} count={TASK_STATUSES.length} />
      <h2 className="kanban-column__name">{label}</h2>
      <span className="kanban-column__count">{formatCount(count)}</span>
      {onAdd && (
        <IconButton label={`Adicionar tarefa em ${label}`} size="sm" className="kanban-column__add" onPress={onAdd}>
          <Plus size={14} />
        </IconButton>
      )}
    </header>
  );
}
