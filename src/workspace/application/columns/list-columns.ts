import type { WorkspaceContext } from '../ports.js';

/** The active columns in board order, with the live tasks of every project in each, and the revision. */
export function listColumns(ctx: WorkspaceContext) {
  return ctx.read(async (repo) => {
    const [columns, counts] = [await repo.activeColumns(), await repo.columnTaskCounts()];
    return {
      revision: await repo.revision(),
      columns: columns.map((column) => ({
        id: column.id,
        name: column.name,
        position: column.position,
        isDone: column.isDone,
        version: column.version,
        taskCount: counts.get(column.id) ?? 0,
      })),
    };
  });
}
