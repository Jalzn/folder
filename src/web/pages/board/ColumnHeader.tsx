import { Plus } from 'lucide-react';
import { formatCount } from '../../lib/count';
import type { ColumnSummary } from '../../lib/queries';
import { ColumnRing, IconButton } from '../../ui';
import { columnLabel } from './board-text';
import { type ColumnCommand, ColumnMenu } from './ColumnMenu';
import { ColumnNameField } from './ColumnNameField';
import { COLUMN_ATTRIBUTE } from './use-board-keyboard';

/**
 * A column's 28 px header (docs/etapas/10-quadro-tarefa.md, "Colunas"): the ring, the name, a button whose ↵
 * renames it in place, the count and, on hover or focus, "+" (not in the done column) and ⋯. An archived
 * project's column shows only its name and count.
 */
export function ColumnHeader({
  column,
  index,
  count,
  total,
  editable,
  active,
  renaming,
  taken,
  menuOpen,
  nameRef,
  onMenuOpenChange,
  onCommand,
  onAdd,
  onRename,
  onRenamed,
}: {
  column: ColumnSummary;
  index: number;
  /** The tasks shown in it. */
  count: number;
  /** How many columns the board has. */
  total: number;
  editable: boolean;
  active: boolean;
  renaming: boolean;
  taken: readonly string[];
  menuOpen: boolean;
  nameRef: (element: HTMLButtonElement | null) => () => void;
  onMenuOpenChange: (open: boolean) => void;
  onCommand: (command: ColumnCommand) => void;
  onAdd: () => void;
  onRename: (name: string) => Promise<boolean>;
  onRenamed: () => void;
}) {
  return (
    <header className="board-column__head">
      <ColumnRing index={index} count={total} isDone={column.isDone} />
      {renaming ? (
        <ColumnNameField initial={column.name} taken={taken} onSubmit={onRename} onDone={onRenamed} />
      ) : (
        <button
          ref={nameRef}
          type="button"
          className="board-column__name"
          tabIndex={active ? 0 : -1}
          aria-label={columnLabel(column.name, count, column.isDone, editable)}
          {...{ [COLUMN_ATTRIBUTE]: column.id }}
          onClick={editable ? () => onCommand('rename') : undefined}
        >
          {column.name}
        </button>
      )}
      <span className="board-column__count" aria-hidden="true">
        {formatCount(count)}
      </span>
      <span className="board-column__grow" />
      {editable && !column.isDone && (
        <IconButton
          label={`Nova tarefa em ${column.name}`}
          size="sm"
          className="board-column__more"
          excludeFromTabOrder
          onPress={onAdd}
        >
          <Plus size={14} />
        </IconButton>
      )}
      {editable && (
        <ColumnMenu
          name={column.name}
          isDone={column.isDone}
          first={index === 0}
          last={index === total - 1}
          open={menuOpen}
          onOpenChange={onMenuOpenChange}
          onCommand={onCommand}
        />
      )}
    </header>
  );
}
