import { nameKey } from '@tinyfold/workspace/domain';
import { api, requestId } from '../../lib/api';
import { inBoardOrder } from '../../lib/board-order';
import { onceMoreIfLost } from '../../lib/lost-answer';
import type { ColumnSummary } from '../../lib/queries';
import type { useAction } from '../../lib/use-action';
import { useAnnounce } from '../../shell/announcer';
import { useUndoableChange } from '../../shell/use-undoable-change';
import { useToast } from '../../ui';
import {
  COLUMN_CHANGED,
  columnDeletedText,
  columnPositionText,
  columnRestoredText,
  doneColumnText,
  newColumnName,
} from './board-text';

/** The done column's changes share one key: a newer switch takes the Desfazer of the one before. */
const DONE_KEY = 'column:done';

/**
 * The column writes of the board (docs/etapas/10-quadro-tarefa.md, "Menu ⋯ da coluna" and "Desfazer"):
 * create, rename, move, delete with a destination, and choose the done column. Columns are the same for
 * every project. Each intent keeps its request ID for the one retry of a lost answer; deleting and switching
 * the done column offer Desfazer, unless the server listed only part of the tasks (`complete: false`).
 */
export function useColumnActions(action: ReturnType<typeof useAction>) {
  const toast = useToast();
  const announce = useAnnounce();
  const change = useUndoableChange(action);

  /** Creates "Nova coluna" (or the first free "Nova coluna 2"…) where new columns go; resolves to its ID. */
  async function create(columns: readonly ColumnSummary[]) {
    const input = {
      requestId: requestId(),
      name: newColumnName(
        columns.map((column) => column.name),
        nameKey,
      ),
    };
    const created = await action.run(() => onceMoreIfLost(() => api.workspace.createColumn(input)));
    return created?.id;
  }

  async function rename(column: ColumnSummary, name: string) {
    const input = { requestId: requestId(), id: column.id, expectedVersion: column.version, name };
    const renamed = await action.run(() => onceMoreIfLost(() => api.workspace.renameColumn(input)));
    if (!renamed) return false;
    announce(`Coluna renomeada para ${name}`);
    return true;
  }

  /** To `index` among the columns, announced: "Coluna Revisão na posição 3 de 4". */
  async function move(column: ColumnSummary, columns: readonly ColumnSummary[], index: number) {
    const ordered = inBoardOrder(columns);
    const at = ordered.findIndex((each) => each.id === column.id);
    if (at < 0 || index === at || index < 0 || index >= ordered.length) return false;
    // Going left, before the column now at `index`; going right, before the one after it, or last.
    const beforeColumnId = index < at ? (ordered[index]?.id ?? null) : (ordered[index + 1]?.id ?? null);
    const input = { requestId: requestId(), id: column.id, beforeColumnId };
    const moved = await action.run(() => onceMoreIfLost(() => api.workspace.moveColumn(input)));
    if (!moved) return false;
    const now = inBoardOrder(moved.columns);
    announce(
      columnPositionText(
        column.name,
        now.findIndex((each) => each.id === column.id),
        now.length,
      ),
    );
    return true;
  }

  /**
   * Deletes a column, its tasks of every project going to `destination`; an empty one needs none. Desfazer
   * gives it back with the tasks that did not change since.
   */
  function remove(column: ColumnSummary, destination: ColumnSummary | null) {
    const input = {
      requestId: requestId(),
      id: column.id,
      expectedVersion: column.version,
      ...(destination ? { destinationId: destination.id } : {}),
    };
    const restoring = requestId();
    return change(
      `column:${column.id}`,
      () => onceMoreIfLost(() => api.workspace.deleteColumn(input)),
      (deleted) => ({
        text: columnDeletedText(deleted.moved.length, destination?.name ?? null),
        changed: COLUMN_CHANGED,
        undo: deleted.complete
          ? async () => {
              const back = {
                requestId: restoring,
                id: column.id,
                expectedVersion: deleted.version,
                moved: deleted.moved,
              };
              const restored = await onceMoreIfLost(() => api.workspace.restoreColumn(back));
              toast(columnRestoredText(column.name, restored.skipped));
            }
          : undefined,
      }),
    );
  }

  /** Makes a column the done one: its tasks are completed now, and the old one's reopen. */
  function makeDone(column: ColumnSummary) {
    const input = { requestId: requestId(), id: column.id };
    const undoing = requestId();
    return change(
      DONE_KEY,
      () => onceMoreIfLost(() => api.workspace.setDoneColumn(input)),
      (done) => ({
        text: doneColumnText(column.name),
        changed: COLUMN_CHANGED,
        undo: done.complete
          ? () =>
              onceMoreIfLost(() =>
                api.workspace.setDoneColumn({ requestId: undoing, id: done.previousId, restore: done.left }),
              )
          : undefined,
      }),
    );
  }

  return { busy: action.busy, create, rename, move, remove, makeDone };
}
