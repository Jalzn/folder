import type { CivilDate } from '@tinyfold/core/domain';
import './item-row.css';
import { isOverdue } from '@tinyfold/board/domain';
import { Clock } from 'lucide-react';
import { Button } from 'react-aria-components';
import { inBoardOrder } from '../../lib/board-order';
import { shortCivilDate } from '../../lib/dates/task-dates';
import type { ColumnSummary, LabelSummary } from '../../lib/queries';
import { displayTitle, type Task } from '../../lib/types';
import { ColumnRing } from '../../ui';

/**
 * A task in a list (docs/etapas/10-quadro-tarefa.md, "Visão geral"): its column's ring, the title, the meta
 * "Em andamento · mcp, backend" and, on the right, "atrasada desde 28 out" in --late or the due date, with the
 * checklist's "2/5"; `date` replaces them, as a completion's. Pressing it opens the task in the drawer.
 */
export function TaskRow({
  task,
  columns,
  labels,
  today,
  date,
  onOpen,
}: {
  task: Task;
  columns: readonly ColumnSummary[];
  labels: ReadonlyMap<string, LabelSummary>;
  today: CivilDate;
  /** What shows on the right instead of the due date. */
  date?: string;
  onOpen: () => void;
}) {
  const ordered = inBoardOrder(columns);
  const index = ordered.findIndex((column) => column.id === task.columnId);
  const column = ordered[index];
  const names = task.labelIds.flatMap((id) => labels.get(id)?.name ?? []);
  const late = isOverdue(task.dueOn, today, Boolean(column?.isDone));
  const meta = [column?.name, names.join(', ')].filter(Boolean).join(' · ');
  return (
    <li>
      <Button className="item-row item-row--task" onPress={onOpen}>
        <span className="item-row__state">
          <ColumnRing index={Math.max(0, index)} count={ordered.length} isDone={Boolean(column?.isDone)} />
        </span>
        <span className="item-row__main">
          <span className="item-row__title">{displayTitle(task.title)}</span>
          {meta && <span className="item-row__meta">{meta}</span>}
        </span>
        <span className="item-row__date">
          {date ??
            (task.dueOn &&
              (late ? (
                <span className="item-row__late">
                  <Clock size={12} aria-hidden="true" />
                  atrasada desde {shortCivilDate(task.dueOn)}
                </span>
              ) : (
                shortCivilDate(task.dueOn)
              )))}
          {!date && task.checklist && (
            <span className="item-row__progress">
              {' '}
              {task.checklist.done}/{task.checklist.total}
            </span>
          )}
        </span>
      </Button>
    </li>
  );
}
