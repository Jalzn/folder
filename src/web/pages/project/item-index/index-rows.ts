import type { IsoInstant } from '@tinyfold/core/domain';
import { excerptFromStart, NAVIGATION_LIMITS } from '@tinyfold/workspace/domain';
import { countOf } from '../../../lib/text/count';
import { displayTitle, type ItemType, itemTypeLabels } from '../../../lib/types';
import type { IndexType } from '../../../navigation/paths';

/** A sortable column of the Índice. Trecho does not sort; Ligações arrives in stage 11. */
export type IndexColumn = 'title' | 'type' | 'updatedAt';

export interface IndexSort {
  column: IndexColumn;
  direction: 'ascending' | 'descending';
}

/** The last edited first, until the person picks another order on this device. */
export const defaultIndexSort: IndexSort = { column: 'updatedAt', direction: 'descending' };

export interface IndexRow {
  key: string;
  type: ItemType;
  id: string;
  title: string;
  excerpt: string;
  updatedAt: IsoInstant;
  /** The folder it is in, or null at the project's root. */
  folderId: string | null;
}

interface Listed {
  id: string;
  title: string;
  plainText: string;
  updatedAt: IsoInstant;
  folderId: string | null;
}

/** A summary's text stops at its first 280 characters: an excerpt of a text that long goes on after it. */
const SUMMARY_TEXT = 280;

/** The Trecho of a row, as the Visão geral cuts it: one line, its pieces joined, and an ellipsis when it goes on. */
const excerptOf = (plainText: string) =>
  excerptFromStart(plainText, NAVIGATION_LIMITS.overview.excerptChars, plainText.length >= SUMMARY_TEXT);

/** The project's documents and drawings as rows, keeping only the type the `tipo` filter asks for. */
export function indexRows(documents: readonly Listed[], drawings: readonly Listed[], tipo?: IndexType): IndexRow[] {
  const row = (type: ItemType) => (item: Listed) => ({
    key: `${type}:${item.id}`,
    type,
    id: item.id,
    title: item.title,
    excerpt: excerptOf(item.plainText),
    updatedAt: item.updatedAt,
    folderId: item.folderId,
  });
  return [
    ...(tipo === 'desenhos' ? [] : documents.map(row('document'))),
    ...(tipo === 'documentos' ? [] : drawings.map(row('drawing'))),
  ];
}

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
const titleOf = (row: IndexRow) => displayTitle(row.title);
const byEdited = (a: IndexRow, b: IndexRow) => b.updatedAt.localeCompare(a.updatedAt);
const compare: Record<IndexColumn, (a: IndexRow, b: IndexRow) => number> = {
  title: (a, b) => collator.compare(titleOf(a), titleOf(b)),
  type: (a, b) => collator.compare(itemTypeLabels[a.type], itemTypeLabels[b.type]),
  updatedAt: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
};

/** Sorts by the column, then the last edited first and the title, so equal rows keep a steady order. */
export function sortIndexRows(rows: readonly IndexRow[], sort: IndexSort): IndexRow[] {
  const sign = sort.direction === 'ascending' ? 1 : -1;
  return [...rows].sort(
    (a, b) => sign * compare[sort.column](a, b) || byEdited(a, b) || collator.compare(titleOf(a), titleOf(b)),
  );
}

/** A header pressed: the same column turns around; a new one starts A–Z for the title, newest first otherwise. */
export function nextIndexSort(current: IndexSort, column: IndexColumn): IndexSort {
  if (current.column === column)
    return { column, direction: current.direction === 'ascending' ? 'descending' : 'ascending' };
  return { column, direction: column === 'title' ? 'ascending' : 'descending' };
}

/** How the Índice shows on this device: its order, and whether it groups by folder (on at first). */
export interface IndexView {
  sort: IndexSort;
  grouped: boolean;
}

/** Reads the stored view tolerantly, the order alone of stage 08 too: anything invalid is the default. */
export function parseIndexView(raw: string | null): IndexView {
  let value: (Partial<IndexSort> & { grouped?: unknown }) | null = null;
  try {
    value = raw ? JSON.parse(raw) : null;
  } catch {
    // A broken value starts over.
  }
  const sort =
    value &&
    (value.column === 'title' || value.column === 'type' || value.column === 'updatedAt') &&
    (value.direction === 'ascending' || value.direction === 'descending')
      ? { column: value.column, direction: value.direction }
      : defaultIndexSort;
  return { sort, grouped: value?.grouped !== false };
}

const nouns: Record<IndexType | 'all', [string, string, string]> = {
  all: ['Nenhum item', 'item', 'itens'],
  documentos: ['Nenhum documento', 'documento', 'documentos'],
  desenhos: ['Nenhum desenho', 'desenho', 'desenhos'],
};

/**
 * "12 itens em Tinyfold. Clique no cabeçalho de uma coluna para ordenar.", with the folder of the filter
 * after the project: "12 itens em Tinyfold · MCP."
 */
export function indexSummary(count: number, projectName: string, tipo?: IndexType, folderName?: string) {
  const [none, one, many] = nouns[tipo ?? 'all'];
  const place = folderName ? `${projectName} · ${folderName}` : projectName;
  if (!count) return `${none} em ${place}.`;
  return `${countOf(count, one, many)} em ${place}. Clique no cabeçalho de uma coluna para ordenar.`;
}
