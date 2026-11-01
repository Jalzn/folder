import { AppError } from '@tinyfold/core/application';
import { COLUMN_LIMITS } from '../../domain/columns.js';
import type { WorkspaceContext } from '../ports.js';
import type { SetDoneColumnInput } from '../schemas/columns.js';
import { requireActiveColumn } from './column-rules.js';

/**
 * Makes an active column the done one, in one transaction: the old one stops being it, its tasks
 * lose their completion and the new one's tasks, live and trashed, are completed now, without a new
 * version or update date, since this changes the board and not each task. The answer lists the old
 * column's tasks with the completion each had (at most COLUMN_LIMITS.listedTasks, `complete` false
 * beyond), which the undo sends back as `restore` when switching back: a listed task still in the
 * new done column gets its completion back.
 */
export function setDoneColumn(ctx: WorkspaceContext, input: SetDoneColumnInput) {
  return ctx.write('workspace.setDoneColumn', input, async (repo) => {
    const column = await requireActiveColumn(repo, input.id);
    if (column.isDone) throw new AppError('DOMAIN_RULE', 'Esta coluna já é a de conclusão.');
    const previous = (await repo.activeColumns()).find((item) => item.isDone);
    if (!previous) throw new AppError('DOMAIN_RULE', 'O quadro não tem coluna de conclusão.');
    // Every task in the done column has a completion: a trigger keeps it so.
    const left = (await repo.tasksOfColumn(previous.id)).flatMap((task) =>
      task.completedAt ? [{ id: task.id, completedAt: task.completedAt }] : [],
    );
    const now = ctx.now();
    // One done column at a time: the old one first.
    await repo.setColumnDone(previous.id, false);
    await repo.setColumnDone(column.id, true);
    await repo.setColumnCompletion(previous.id, null);
    await repo.setColumnCompletion(column.id, now);
    for (const listed of input.restore ?? []) {
      const task = await repo.findTask(listed.id);
      if (task?.columnId === column.id) await repo.setTaskCompletion(task.id, listed.completedAt);
    }
    return {
      revision: await repo.bumpRevision(),
      previousId: previous.id,
      left: left.slice(0, COLUMN_LIMITS.listedTasks),
      complete: left.length <= COLUMN_LIMITS.listedTasks,
    };
  });
}
