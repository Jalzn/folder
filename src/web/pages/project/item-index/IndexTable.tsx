import { Link, useNavigate } from '@tanstack/react-router';
import { ChevronDown, ChevronUp, FileText, Shapes } from 'lucide-react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { Cell, Column, Row, Table, TableBody, TableHeader } from 'react-aria-components';
import { cx } from '../../../lib/cx';
import { shortDate } from '../../../lib/dates';
import { type ItemType, itemTypeLabels } from '../../../lib/types';
import { paths } from '../../../router/paths';
import type { IndexColumn, IndexRow, IndexSort } from './index-rows';

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
 */
export function IndexTable({
  label,
  projectId,
  rows,
  sort,
  onSort,
}: {
  label: string;
  projectId: string;
  rows: IndexRow[];
  sort: IndexSort;
  onSort: (column: IndexColumn) => void;
}) {
  const navigate = useNavigate();
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
          <Column id="excerpt" className="index-table__column index-table__column--excerpt">
            Trecho
          </Column>
          <SortableColumn id="updatedAt" end>
            Editado
          </SortableColumn>
        </TableHeader>
        <TableBody items={rows} renderEmptyState={() => <p className="index-table__empty">Nada aqui.</p>}>
          {(row) => {
            const href = paths.item(projectId, row.type, row.id);
            const Icon = icons[row.type];
            return (
              <Row
                id={row.key}
                className="index-table__row"
                textValue={row.title || 'Sem título'}
                onAction={() => void navigate({ href })}
              >
                <Cell className="index-table__cell">
                  <Link to={href} className="index-table__link">
                    <Icon size={16} aria-hidden="true" />
                    <span>{row.title || 'Sem título'}</span>
                  </Link>
                </Cell>
                <Cell className="index-table__cell index-table__type">{itemTypeLabels[row.type]}</Cell>
                <Cell className="index-table__cell index-table__excerpt">{row.excerpt}</Cell>
                <Cell className="index-table__cell index-table__date">
                  <time dateTime={row.updatedAt}>{shortDate(row.updatedAt)}</time>
                </Cell>
              </Row>
            );
          }}
        </TableBody>
      </Table>
    </div>
  );
}
