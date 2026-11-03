import { assertVersion } from '@tinyfold/core/application';
import type { IsoInstant } from '@tinyfold/core/domain';
import { COLUMN_LIMITS, columnDeletionBlocker } from '../../domain/columns.js';
import { boardErrors } from '../errors.js';
import type { BoardContext } from '../ports/context.js';
import type { TaskRecord } from '../ports/tasks.js';
import type { DeleteColumnInput } from '../schemas/columns.js';
import { renumberColumns, requireActiveColumn } from './column-rules.js';

/** A task a deletion moved to the destination: its new version, and its place and completion before. */
export interface MovedTask {
  id: string;
  version: number;
  position: number;
  completedAt: IsoInstant | null;
}

/**
 * Deletes a column logically, moving every task in it, live and trashed, of every project, to the
 * destination: each to the end of the destination of its project, in the order it was, with a new
 * version and the same update date, since nobody edited it. In the done column it is completed now.
 * The column keeps its last position, and the answer, which restoreColumn takes back, lists at most
 * COLUMN_LIMITS.listedTasks tasks, `complete` false beyond that. The done column and the last open
 * one cannot go.
 */
export function deleteColumn(ctx: BoardContext, input: DeleteColumnInput) {
  return ctx.write('workspace.deleteColumn', input, async (repo) => {
    const column = await requireActiveColumn(repo, input.id);
    assertVersion(column.version, input.expectedVersion);
    const columns = await repo.activeColumns();
    const blocker = columnDeletionBlocker(column, columns);
    if (blocker === 'done') throw boardErrors.cannotDeleteDoneColumn();
    if (blocker === 'lastOpen') throw boardErrors.cannotDeleteLastOpenColumn();
    const tasks = await repo.tasksOfColumn(column.id);
    if (input.destinationId === column.id) throw boardErrors.sameColumnDestination();
    const destination = input.destinationId ? columns.find((item) => item.id === input.destinationId) : undefined;
    if (input.destinationId && !destination) throw boardErrors.columnDestinationMissing();
    if (tasks.length && !destination) throw boardErrors.columnDestinationRequired();

    const now = ctx.now();
    const moved: MovedTask[] = [];
    const next = new Map<string, number>();
    for (const task of tasks) {
      if (!destination) break;
      const position =
        next.get(task.projectId) ?? (await repo.nextPosition({ projectId: task.projectId, columnId: destination.id }));
      next.set(task.projectId, position + 1);
      const saved: TaskRecord = {
        ...task,
        columnId: destination.id,
        position,
        completedAt: destination.isDone ? now : null,
        version: task.version + 1,
      };
      await repo.saveTaskFields(saved, task.version);
      moved.push({ id: task.id, version: saved.version, position: task.position, completedAt: task.completedAt });
    }
    const version = column.version + 1;
    await repo.saveColumn({ ...column, version, updatedAt: now, deletedAt: now }, column.version);
    await renumberColumns(
      repo,
      columns.filter((item) => item.id !== column.id),
    );
    return {
      id: column.id,
      version,
      revision: await repo.bumpRevision(),
      moved: moved.slice(0, COLUMN_LIMITS.listedTasks),
      complete: moved.length <= COLUMN_LIMITS.listedTasks,
    };
  });
}
