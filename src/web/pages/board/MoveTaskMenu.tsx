import { ArrowDownToLine, ArrowUpToLine } from 'lucide-react';
import type { Key, RefObject } from 'react';
import { columnMenuItems } from '../../components/task-drawer';
import type { ColumnSummary } from '../../lib/queries';
import { MenuItem, MenuList, MenuSection, MenuSeparator, PopoverSurface } from '../../ui';

/** What "Mover para" chose: a column, or the top or the end of the card's own. */
export type MoveChoice = { kind: 'column'; columnId: string } | { kind: 'top' } | { kind: 'end' };

const COLUMN = 'column:';

/** The menu key of a choice, back to the choice. */
export function moveChoice(key: Key): MoveChoice | null {
  const value = String(key);
  if (value === 'top' || value === 'end') return { kind: value };
  return value.startsWith(COLUMN) ? { kind: 'column', columnId: value.slice(COLUMN.length) } : null;
}

/**
 * "Mover para" (docs/etapas/10-quadro-tarefa.md, "⋯ do card"): the columns as radios, the card's own checked,
 * then "Topo da coluna" and "Fim da coluna". The items, for the card's submenu and for M's popover.
 */
export function moveTaskSections(columns: readonly ColumnSummary[], columnId: string) {
  return [
    <MenuSection key="columns" title="Colunas" selectionMode="single" selectedKeys={[`${COLUMN}${columnId}`]}>
      {columnMenuItems(columns, COLUMN)}
    </MenuSection>,
    <MenuSeparator key="separator" />,
    <MenuSection key="place">
      <MenuItem id="top" icon={<ArrowUpToLine size={16} />}>
        Topo da coluna
      </MenuItem>
      <MenuItem id="end" icon={<ArrowDownToLine size={16} />}>
        Fim da coluna
      </MenuItem>
    </MenuSection>,
  ];
}

/** M on a card: "Mover para" at once, under the card. */
export function MoveTaskPopover({
  columns,
  columnId,
  triggerRef,
  onChoose,
  onClose,
}: {
  columns: readonly ColumnSummary[];
  columnId: string;
  triggerRef: RefObject<HTMLElement | null>;
  onChoose: (choice: MoveChoice) => void;
  onClose: () => void;
}) {
  return (
    <PopoverSurface
      triggerRef={triggerRef}
      isOpen
      onOpenChange={(open) => !open && onClose()}
      placement="bottom start"
      aria-label="Mover para"
    >
      <MenuList
        aria-label="Mover para"
        autoFocus="first"
        onAction={(key) => {
          const choice = moveChoice(key);
          onClose();
          if (choice) onChoose(choice);
        }}
      >
        {moveTaskSections(columns, columnId)}
      </MenuList>
    </PopoverSurface>
  );
}
