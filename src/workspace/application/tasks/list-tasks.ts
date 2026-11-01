import type { WorkspaceContext } from '../ports.js';
import type { ListTasksInput } from '../schemas/tasks.js';

/** The live tasks of a project, or of those created from a document, with the board revision. */
export function listTasks(ctx: WorkspaceContext, input: ListTasksInput) {
  return ctx.read(async (repo) => ({ tasks: await repo.listTasks(input), revision: await repo.revision() }));
}
