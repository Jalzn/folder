import { AppError } from '@tinyfold/core/application';
import { DomainError } from '@tinyfold/core/domain';
import { type CompletedKey, completedCursor, readCompletedCursor } from '../../domain/paging.js';
import { requireProject } from '../helpers.js';
import type { WorkspaceContext } from '../ports.js';
import type { ListCompletedTasksInput } from '../schemas/tasks.js';

function readCursor(cursor: string | undefined): CompletedKey | undefined {
  if (cursor === undefined) return undefined;
  try {
    return readCompletedCursor(cursor);
  } catch (error) {
    if (error instanceof DomainError) throw new AppError('VALIDATION', error.message);
    throw error;
  }
}

/**
 * One project's live completed tasks, the most recently completed first, by keyset pages
 * (c~<completedAt>~<id>): a task completed or reopened meanwhile neither repeats nor skips others.
 */
export async function listCompletedTasks(ctx: WorkspaceContext, input: ListCompletedTasksInput) {
  const after = readCursor(input.cursor);
  return ctx.read(async (repo) => {
    await requireProject(repo, input.projectId);
    const page = await repo.completedTasks(input.projectId, after, input.limit + 1);
    const items = page.slice(0, input.limit);
    const last = items.at(-1);
    return {
      items,
      total: await repo.completedCount(input.projectId),
      nextCursor:
        page.length > input.limit && last?.completedAt
          ? completedCursor({ completedAt: last.completedAt, id: last.id })
          : null,
    };
  });
}
