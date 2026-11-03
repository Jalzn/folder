import { restoredPosition } from '../../domain/order.js';
import { workspaceErrors } from '../errors.js';
import type { WorkspaceContext } from '../ports/context.js';
import type { RestoreColumnInput } from '../schemas/columns.js';
import { assertVersion } from '../version.js';
import { assertColumnNameFree, assertPastCompletions, assertRoomForColumn, renumberColumns } from './column-rules.js';

/**
 * Undoes deleteColumn with the list it answered. The column comes back at the position it had, or
 * at the end, with a new version. Each listed task still at the version the deletion gave it (so
 * still in the destination: any move or trash since raised its version) comes back to the column at
 * its place before, with a new version and its completion before, which was none: only an open
 * column can be deleted. Every other task is skipped and counted. Nothing records which tasks the
 * deletion moved, so the list is the client's word, as with folders, save a completion in the
 * future, which is refused (assertPastCompletions).
 */
export function restoreColumn(ctx: WorkspaceContext, input: RestoreColumnInput) {
  return ctx.write('workspace.restoreColumn', input, async (repo) => {
    assertPastCompletions(
      input.moved.map((listed) => listed.completedAt),
      ctx.now(),
    );
    const column = await repo.findColumn(input.id);
    if (!column) throw workspaceErrors.columnMissing();
    assertVersion(column.version, input.expectedVersion);
    if (!column.deletedAt) throw workspaceErrors.columnNotTrashed();
    const columns = await repo.activeColumns();
    assertColumnNameFree(columns, column.name, column.id, ' Renomeie-a antes de desfazer.');
    assertRoomForColumn(columns);

    const now = ctx.now();
    const version = column.version + 1;
    const position = restoredPosition(column.position, columns.length);
    const restoredColumn = { ...column, version, position, updatedAt: now, deletedAt: null };
    await repo.saveColumn(restoredColumn, column.version);
    await renumberColumns(repo, columns.toSpliced(position, 0, { ...column, position }));

    let restored = 0;
    for (const listed of input.moved) {
      const task = await repo.findTask(listed.id);
      if (!task || task.version !== listed.version) continue;
      const back = {
        ...task,
        columnId: column.id,
        position: listed.position,
        completedAt: null,
        version: task.version + 1,
      };
      await repo.saveTaskFields(back, task.version);
      restored += 1;
    }
    return {
      id: column.id,
      version,
      position,
      revision: await repo.bumpRevision(),
      restored,
      skipped: input.moved.length - restored,
    };
  });
}
