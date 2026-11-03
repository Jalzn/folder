import { reorderById } from '../../domain/order.js';
import { workspaceErrors } from '../errors.js';
import type { WorkspaceContext } from '../ports/context.js';
import type { MoveColumnInput } from '../schemas/columns.js';
import { renumberColumns, requireActiveColumn } from './column-rules.js';

/** Places an active column before another, or at the end. Not an edit of it: the revision goes up. */
export function moveColumn(ctx: WorkspaceContext, input: MoveColumnInput) {
  return ctx.write('workspace.moveColumn', input, async (repo) => {
    const column = await requireActiveColumn(repo, input.id);
    if (input.beforeColumnId === column.id) throw workspaceErrors.sameColumnReference();
    const columns = await repo.activeColumns();
    const ordered = reorderById(columns, column.id, input.beforeColumnId);
    if (!ordered) throw workspaceErrors.staleColumnReference();
    await renumberColumns(repo, ordered);
    return {
      revision: await repo.bumpRevision(),
      columns: ordered.map((item, position) => ({ id: item.id, position })),
    };
  });
}
