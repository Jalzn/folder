import { type CompletedKey, completedCursor, readCompletedCursor } from '../../domain/paging.js';
import { readClientCursor } from '../client-cursor.js';
import { requireProject } from '../helpers.js';
import type { WorkspaceContext } from '../ports/context.js';
import type { ListCompletedTasksInput } from '../schemas/tasks.js';

function readCursor(cursor: string | undefined): CompletedKey | undefined {
  return cursor === undefined ? undefined : readClientCursor(() => readCompletedCursor(cursor));
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
