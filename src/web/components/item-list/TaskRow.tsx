import './item-row.css';
import { Button } from 'react-aria-components';
import { displayTitle, TASK_STATUSES, type Task, taskStatusLabels } from '../../lib/types';
import { ColumnRing } from '../../ui';

/** A task in a list: its column ring, the title and the column's name. Pressing it opens the task. */
export function TaskRow({ task, onOpen }: { task: Task; onOpen: () => void }) {
  return (
    <li>
      <Button className="item-row item-row--task" onPress={onOpen}>
        <span className="item-row__state">
          <ColumnRing index={TASK_STATUSES.indexOf(task.status)} count={TASK_STATUSES.length} />
        </span>
        <span className="item-row__main">
          <span className="item-row__title">{displayTitle(task.title)}</span>
          <span className="item-row__meta">{taskStatusLabels[task.status]}</span>
        </span>
      </Button>
    </li>
  );
}
