import { assertVersion } from '../helpers.js';
import type { WorkspaceContext } from '../ports/context.js';
import type { RenameColumnInput } from '../schemas/columns.js';
import { assertColumnNameFree, readColumnName, requireActiveColumn } from './column-rules.js';

/** Renames an active column, with a new version. The order stays, and so does the revision. */
export function renameColumn(ctx: WorkspaceContext, input: RenameColumnInput) {
  return ctx.write('workspace.renameColumn', input, async (repo) => {
    const column = await requireActiveColumn(repo, input.id);
    assertVersion(column.version, input.expectedVersion);
    const name = readColumnName(input.name);
    assertColumnNameFree(await repo.activeColumns(), name, column.id);
    const version = column.version + 1;
    await repo.saveColumn({ ...column, name, version, updatedAt: ctx.now() }, column.version);
    return { id: column.id, version };
  });
}
