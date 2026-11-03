import { AppError } from '@tinyfold/core/application';
import { checklistProgress } from '../../domain/checklist.js';
import type { Column } from '../../domain/columns.js';
import { documentPlainText, withBlockIds } from '../../domain/document.js';
import type { DocumentContent } from '../../domain/document-models.js';
import type { TaskAck } from '../../domain/task-models.js';
import { TASK_LIMITS } from '../../domain/tasks.js';
import { titleOrUntitled } from '../../domain/text.js';
import { workspaceErrors } from '../errors.js';
import type { WorkspaceRepository } from '../ports/context.js';
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
  repo: WorkspaceRepository,
  input: { columnId?: string | undefined },
  fallback: (columns: Column[]) => Column | undefined,
): Promise<Column> {
  const columns = await repo.activeColumns();
  const id = input.columnId ?? fallback(columns)?.id;
  const column = columns.find((candidate) => candidate.id === id);
  if (!column) throw workspaceErrors.columnMissing();
  return column;
}

/**
 * Where a task joining a column of its project goes: the top of the done column, where the latest
 * completion shows, or the end of any other (decision 13). Going to the top renumbers the column.
 */
export async function placeIn(repo: WorkspaceRepository, projectId: string, column: Column, taskId: string) {
  if (!column.isDone) return repo.nextPosition({ projectId: projectId, columnId: column.id });
  return topPosition(repo, projectId, column.id, taskId);
}

/** The top of one project's column, after moving the others down one. */
async function topPosition(repo: WorkspaceRepository, projectId: string, columnId: string, taskId: string) {
  const others = (await repo.tasksInColumn({ projectId: projectId, columnId: columnId })).filter(
    (task) => task.id !== taskId,
  );
  for (const [index, task] of others.entries())
    if (task.position !== index + 1) await repo.setTaskPosition(task.id, index + 1);
  return 0;
}

/** The completion a task has in `column`: kept while it stays done, now on entering, none outside it. */
export const completionIn = (column: Column, task: Pick<TaskRecord, 'completedAt'> | undefined, now: string) =>
  column.isDone ? (task?.completedAt ?? now) : null;

/** The labels a task takes: each active, at most TASK_LIMITS.labels, repeats counted once. */
export async function requireTaskLabels(repo: WorkspaceRepository, labelIds: readonly string[]): Promise<string[]> {
  const ids = [...new Set(labelIds)];
  if (ids.length > TASK_LIMITS.labels)
    throw new AppError('VALIDATION', `Use até ${TASK_LIMITS.labels} etiquetas numa tarefa.`);
  const found = await repo.findLabels(ids);
  if (found.length !== ids.length || found.some((label) => label.deletedAt)) throw workspaceErrors.labelMissing();
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
