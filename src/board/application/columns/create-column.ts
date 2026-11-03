import { newColumnPosition } from '../../domain/columns.js';
import type { BoardContext } from '../ports/context.js';
import type { CreateColumnInput } from '../schemas/columns.js';
import { assertColumnNameFree, assertRoomForColumn, readColumnName, renumberColumns } from './column-rules.js';

/**
 * A new column goes before the done column when that one is the last, and at the end otherwise
 * (newColumnPosition). The board order changes, so the revision goes up.
 */
export function createColumn(ctx: BoardContext, input: CreateColumnInput) {
  return ctx.write('workspace.createColumn', input, async (repo) => {
    const name = readColumnName(input.name);
    const columns = await repo.activeColumns();
    assertColumnNameFree(columns, name);
    assertRoomForColumn(columns);
    const now = ctx.now();
    const position = newColumnPosition(columns);
    const column = {
      id: ctx.newId(),
      name,
      position,
      isDone: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await repo.insertColumn(column);
    await renumberColumns(repo, columns.toSpliced(position, 0, column));
    return { id: column.id, version: column.version, position, revision: await repo.bumpRevision() };
  });
}
