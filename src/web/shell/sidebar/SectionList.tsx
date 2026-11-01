import type { NavItem } from '@tinyfold/workspace/domain';
import { ChevronRight } from 'lucide-react';
import type { KeyboardEvent, ReactElement, Ref } from 'react';
import { formatCount } from '../../lib/count';
import { SidebarRow } from './SidebarRow';
import { type SectionRows, showsPinnedRule } from './section-rows';

/**
 * The rows of Documentos or Desenhos, the same in the sidebar and in the rail's popover: the pinned items,
 * the line under them, the others, the open item, "Ver todos" and, empty, "Nada aqui ainda.". One keyed
 * list, so a row that gets pinned moves, with its focus, instead of being created again.
 */
export function SectionList({
  id,
  rows,
  total,
  seeAllHref,
  renderItem,
  listRef,
  onKeyDown,
}: {
  id?: string;
  rows: SectionRows;
  total: number;
  seeAllHref: string;
  /** A row for an item, keyed by its id. */
  renderItem: (item: NavItem) => ReactElement;
  listRef?: Ref<HTMLUListElement>;
  onKeyDown?: (event: KeyboardEvent<HTMLUListElement>) => void;
}) {
  return (
    <ul
      {...(id ? { id } : {})}
      {...(listRef ? { ref: listRef } : {})}
      {...(onKeyDown ? { onKeyDown } : {})}
      className="sidebar-section__list"
    >
      {[
        ...rows.pinned.map(renderItem),
        ...(showsPinnedRule(rows)
          ? [<li key="pinned-rule" className="sidebar-section__rule" aria-hidden="true" />]
          : []),
        ...rows.items.map(renderItem),
        ...(rows.active ? [renderItem(rows.active)] : []),
      ]}
      {rows.seeAll !== null && (
        <li>
          <SidebarRow
            href={seeAllHref}
            icon={<ChevronRight size={16} />}
            label="Ver todos"
            meta={formatCount(rows.seeAll)}
          />
        </li>
      )}
      {total === 0 && <li className="sidebar-section__empty">Nada aqui ainda.</li>}
    </ul>
  );
}
