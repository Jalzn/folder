import type { NavItem, NavSection } from '@tinyfold/workspace/domain';

export interface SectionRows {
  /** In pinning order, above a line. */
  pinned: NavItem[];
  /** Up to the section limit, in the chosen order. */
  items: NavItem[];
  /** The open item when the list leaves it out: it always shows, as the next row. */
  active: NavItem | null;
  /** How many items "Ver todos" opens in the Índice, or null when every item already shows. */
  seeAll: number | null;
}

/** The rows of a sidebar section (docs/etapas/08-fundacao.md, "Lateral, variante A"). */
export function sectionRows(section: NavSection, active: NavItem | null): SectionRows {
  const shown = (item: NavItem) =>
    section.pinned.some(({ id }) => id === item.id) || section.items.some(({ id }) => id === item.id);
  const extra = active && !shown(active) ? active : null;
  const listed = section.pinned.length + section.items.length;
  return {
    pinned: section.pinned,
    items: section.items,
    active: extra,
    seeAll: section.total > listed ? section.total : null,
  };
}
