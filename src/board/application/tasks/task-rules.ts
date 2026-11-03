import type { IsoInstant } from '#core/domain';
import type { DocumentContent } from '#rich-text/domain';
import { checklistProgress, documentPlainText, withBlockIds } from '#rich-text/domain';
import type { Column } from '../../domain/columns.js';
import type { TaskAck } from '../../domain/task-models.js';
import { TASK_LIMITS } from '../../domain/tasks.js';
import { titleOrUntitled } from '../../domain/text.js';
import { boardErrors } from '../errors.js';
import type { BoardRepositories } from '../ports/context.js';
import type { TaskRecord } from '../ports/tasks.js';

/** The answer of a task write, without its title (see TaskAck). */
export const taskAck = (task: TaskRecord, revision: number): TaskAck => ({
  id: task.id,
  projectId: task.projectId,
  version: task.version,
  updatedAt: task.updatedAt,
  revision,
});

/** The active column a write names by its ID, or `fallback` without one. */
export async function columnFor(
  repo: BoardRepositories,
  input: { columnId?: string | undefined },
  fallback: (columns: Column[]) => Column | undefined,
): Promise<Column> {
  const columns = await repo.activeColumns();
  const id = input.columnId ?? fallback(columns)?.id;
  const column = columns.find((candidate) => candidate.id === id);
  if (!column) throw boardErrors.columnMissing();
  return column;
}

/**
 * Where a task joining a column of its project goes: the top of the done column, where the latest
 * completion shows, or the end of any other (decision 13). Going to the top renumbers the column.
 */
export async function placeIn(repo: BoardRepositories, projectId: string, column: Column, taskId: string) {
  if (!column.isDone) return repo.nextPosition({ projectId: projectId, columnId: column.id });
  return topPosition(repo, projectId, column.id, taskId);
}

/** The top of one project's column, after moving the others down one. */
async function topPosition(repo: BoardRepositories, projectId: string, columnId: string, taskId: string) {
  const others = (await repo.tasksInColumn({ projectId: projectId, columnId: columnId })).filter(
    (task) => task.id !== taskId,
  );
  for (const [index, task] of others.entries())
    if (task.position !== index + 1) await repo.setTaskPosition(task.id, index + 1);
  return 0;
}

/** The completion a task has in `column`: kept while it stays done, now on entering, none outside it. */
export const completionIn = (column: Column, task: Pick<TaskRecord, 'completedAt'> | undefined, now: IsoInstant) =>
  column.isDone ? (task?.completedAt ?? now) : null;

/** The labels a task takes: each active, at most TASK_LIMITS.labels, repeats counted once. */
export async function requireTaskLabels(repo: BoardRepositories, labelIds: readonly string[]): Promise<string[]> {
  const ids = [...new Set(labelIds)];
  if (ids.length > TASK_LIMITS.labels) throw boardErrors.taskLabelLimit();
  const found = await repo.findLabels(ids);
  if (found.length !== ids.length || found.some((label) => label.deletedAt)) throw boardErrors.labelMissing();
  return ids;
}

/**
 * A task's text as stored: the title, "Sem título" when empty, and the description with an id on each
 * block, its plain text and its checklist, which the board shows without the description.
 */
export function taskText(title: string, description: DocumentContent, newId: () => string) {
  const content = withBlockIds(description, newId);
  const checklist = checklistProgress(content);
  return {
    title: titleOrUntitled(title),
    description: content,
    descriptionPlainText: documentPlainText(content),
    checklistDone: checklist.done,
    checklistTotal: checklist.total,
  };
}
