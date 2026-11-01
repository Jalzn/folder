import { AppError } from '@tinyfold/core/application';
import { reorder } from '../../domain/order.js';
import type { WorkspaceContext } from '../ports.js';
import type { MoveColumnInput } from '../schemas/columns.js';
import { renumberColumns, requireActiveColumn } from './column-rules.js';

/** Places an active column before another, or at the end. Not an edit of it: the revision goes up. */
export function moveColumn(ctx: WorkspaceContext, input: MoveColumnInput) {
  return ctx.write('workspace.moveColumn', input, async (repo) => {
    const column = await requireActiveColumn(repo, input.id);
    if (input.beforeColumnId === column.id) throw new AppError('VALIDATION', 'Escolha outra coluna como referência.');
    const columns = await repo.activeColumns();
    const order = reorder(
      columns.map((item) => item.id),
      column.id,
      input.beforeColumnId,
    );
    if (!order) throw new AppError('NOT_FOUND', 'A coluna de referência não está mais entre as do quadro.');
    const byId = new Map(columns.map((item) => [item.id, item]));
    const ordered = order.flatMap((id) => byId.get(id) ?? []);
    await renumberColumns(repo, ordered);
    return {
      revision: await repo.bumpRevision(),
      columns: ordered.map((item, position) => ({ id: item.id, position })),
    };
  });
}
