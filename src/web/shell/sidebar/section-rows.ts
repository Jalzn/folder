import type { NavItem, NavSection } from '@tinyfold/workspace/domain';
import type { ItemType } from '../../lib/types';
import type { IndexType } from '../../router/paths';
import type { SectionKind } from './sidebar-prefs';

/** Documentos and Desenhos, in the sidebar and on the rail. */
export const sectionKinds: Record<SectionKind, { type: ItemType; label: string; noun: string; index: IndexType }> = {
  documents: { type: 'document', label: 'Documentos', noun: 'documento', index: 'documentos' },
  drawings: { type: 'drawing', label: 'Desenhos', noun: 'desenho', index: 'desenhos' },
};

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

/** The line under the pinned items shows when something follows them: other items or the open one. */
export const showsPinnedRule = (rows: SectionRows) =>
  rows.pinned.length > 0 && (rows.items.length > 0 || rows.active !== null);
