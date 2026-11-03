import { Link, useNavigate } from '@tanstack/react-router';
import { ChevronDown, ChevronUp, FileText, Folder, Shapes } from 'lucide-react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { Cell, Column, Row, Table, TableBody, TableHeader } from 'react-aria-components';
import { cx } from '../../../lib/cx';
import { shortInstant } from '../../../lib/dates/dates';
import { formatCount } from '../../../lib/text/count';
import { displayTitle, type ItemType, itemTypeLabels } from '../../../lib/types';
import { paths } from '../../../navigation/paths';
import { folderNameOf, type IndexFolderEntry, type IndexGroup } from './index-groups';
import type { IndexColumn, IndexRow, IndexSort } from './index-rows';

/** A line of the table's body: a group's heading, or an item. */
type Line = { kind: 'group'; key: string; group: IndexGroup } | { kind: 'item'; key: string; row: IndexRow };

const linesOf = (rows: IndexRow[], groups: IndexGroup[] | null): Line[] =>
  groups
    ? groups.flatMap((group) => [
        { kind: 'group' as const, key: group.key, group },
        ...group.rows.map((row) => ({ kind: 'item' as const, key: row.key, row })),
      ])
    : rows.map((row) => ({ kind: 'item' as const, key: row.key, row }));

const icons: Record<ItemType, typeof FileText> = { document: FileText, drawing: Shapes };

/**
 * The table's type-to-select would take single letters, so N, G V and the other shortcuts would not work
 * on a focused row. The letter goes to the shortcuts instead, as if pressed on the page; arrows, Enter and
 * Space stay with the table.
 */
function letShortcutsWin(event: ReactKeyboardEvent<HTMLDivElement>) {
  const letter = event.key.length === 1 && event.key !== ' ';
  if (!letter || event.ctrlKey || event.metaKey || event.altKey || event.nativeEvent.isComposing) return;
  event.stopPropagation();
  event.preventDefault();
  document.body.dispatchEvent(
    new KeyboardEvent('keydown', { key: event.key, shiftKey: event.shiftKey, bubbles: true }),
  );
}

function SortableColumn({ id, end, children }: { id: IndexColumn; end?: boolean; children: ReactNode }) {
  return (
    <Column
      id={id}
      allowsSorting
      isRowHeader={id === 'title'}
      className={cx('index-table__column', `index-table__column--${id}`, end && 'index-table__column--end')}
    >
      {({ sortDirection }) => (
        <span className="index-table__heading">
          {children}
          {sortDirection === 'ascending' && <ChevronUp size={14} aria-hidden="true" />}
          {sortDirection === 'descending' && <ChevronDown size={14} aria-hidden="true" />}
        </span>
      )}
    </Column>
  );
}

/**
 * The Índice's table: Título (the type's icon and a link), Tipo, Trecho in one line and Editado. A header
 * sorts by its column, announced with `aria-sort`. A row opens its item with Enter or a click anywhere.
 * Grouped by folder, a heading row with the folder's name and count starts each group (`groups`); without
 * groups, a Pasta column after Tipo names each item's folder (docs/etapas/09-pastas.md, user decision 2).
 */
export function IndexTable({
  label,
  projectId,
  rows,
  groups,
  folders,
  sort,
  onSort,
}: {
  label: string;
  projectId: string;
  rows: IndexRow[];
  /** The rows by folder, or null for one list with the Pasta column. */
  groups: IndexGroup[] | null;
  folders: readonly IndexFolderEntry[];
  sort: IndexSort;
  onSort: (column: IndexColumn) => void;
}) {
  const navigate = useNavigate();
  const grouped = groups !== null;
  const columns = grouped ? 4 : 5;
  return (
    <div className="index-table-scroll" onKeyDownCapture={letShortcutsWin}>
      <Table
        aria-label={label}
        className="index-table"
        sortDescriptor={sort}
        onSortChange={(descriptor) => onSort(descriptor.column as IndexColumn)}
      >
        <TableHeader className="index-table__header">
          <SortableColumn id="title">Título</SortableColumn>
          <SortableColumn id="type">Tipo</SortableColumn>
          {!grouped && (
            <Column id="folder" className="index-table__column index-table__column--folder">
              Pasta
            </Column>
          )}
          <Column id="excerpt" className="index-table__column index-table__column--excerpt">
            Trecho
          </Column>
          <SortableColumn id="updatedAt" end>
            Editado
          </SortableColumn>
        </TableHeader>
        <TableBody
          items={linesOf(rows, groups)}
          dependencies={[grouped, folders]}
          renderEmptyState={() => <p className="index-table__empty">Nada aqui.</p>}
        >
          {(line) => {
            if (line.kind === 'group') {
              const { group } = line;
              const GroupIcon = group.folder ? Folder : FileText;
              return (
                <Row id={line.key} className="index-table__group" textValue={`${group.label}, ${group.rows.length}`}>
                  <Cell colSpan={columns} className="index-table__group-cell">
                    <GroupIcon size={14} aria-hidden="true" />
                    <span className="index-table__group-name">{group.label}</span>
                    <span className="index-table__group-count">{formatCount(group.rows.length)}</span>
                  </Cell>
                </Row>
              );
            }
            const { row } = line;
            const href = paths.item(projectId, row.type, row.id);
            const Icon = icons[row.type];
            return (
              <Row
                id={line.key}
                className="index-table__row"
                textValue={displayTitle(row.title)}
                onAction={() => void navigate({ href })}
              >
                <Cell className="index-table__cell">
                  <Link to={href} className="index-table__link">
                    <Icon size={16} aria-hidden="true" />
                    <span>{displayTitle(row.title)}</span>
                  </Link>
                </Cell>
                <Cell className="index-table__cell index-table__type">{itemTypeLabels[row.type]}</Cell>
                {!grouped && (
                  <Cell className="index-table__cell index-table__folder">{folderNameOf(row, folders)}</Cell>
                )}
                <Cell className="index-table__cell index-table__excerpt">{row.excerpt}</Cell>
                <Cell className="index-table__cell index-table__date">
                  <time dateTime={row.updatedAt}>{shortInstant(row.updatedAt)}</time>
                </Cell>
              </Row>
            );
          }}
        </TableBody>
      </Table>
    </div>
  );
}
