import type { WorkspaceContext } from '../ports/context.js';

/** The active labels in alphabetical order, with the live tasks of every project that use each. */
export function listLabels(ctx: WorkspaceContext) {
  return ctx.read(async (repo) => ({ labels: await repo.labelSummaries() }));
}
