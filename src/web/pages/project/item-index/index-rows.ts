import { type ItemType, itemTypeLabels } from '../../../lib/types';
import type { IndexType } from '../../../router/paths';

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
  updatedAt: string;
}

interface Listed {
  id: string;
  title: string;
  plainText: string;
  updatedAt: string;
}

/** The project's documents and drawings as rows, keeping only the type the `tipo` filter asks for. */
export function indexRows(documents: readonly Listed[], drawings: readonly Listed[], tipo?: IndexType): IndexRow[] {
  const row = (type: ItemType) => (item: Listed) => ({
    key: `${type}:${item.id}`,
    type,
    id: item.id,
    title: item.title,
    excerpt: item.plainText,
    updatedAt: item.updatedAt,
  });
  return [
    ...(tipo === 'desenhos' ? [] : documents.map(row('document'))),
    ...(tipo === 'documentos' ? [] : drawings.map(row('drawing'))),
  ];
}

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
const titleOf = (row: IndexRow) => row.title || 'Sem título';
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

/** Reads the stored order tolerantly: anything invalid is the default. */
export function parseIndexSort(raw: string | null): IndexSort {
  try {
    const value = raw ? (JSON.parse(raw) as Partial<IndexSort>) : null;
    if (
      value &&
      (value.column === 'title' || value.column === 'type' || value.column === 'updatedAt') &&
      (value.direction === 'ascending' || value.direction === 'descending')
    )
      return { column: value.column, direction: value.direction };
  } catch {
    // A broken value starts over.
  }
  return defaultIndexSort;
}

const nouns: Record<IndexType | 'all', [string, string, string]> = {
  all: ['Nenhum item', 'item', 'itens'],
  documentos: ['Nenhum documento', 'documento', 'documentos'],
  desenhos: ['Nenhum desenho', 'desenho', 'desenhos'],
};

/** "12 itens em Tinyfold. Clique no cabeçalho de uma coluna para ordenar." */
export function indexSummary(count: number, projectName: string, tipo?: IndexType) {
  const [none, one, many] = nouns[tipo ?? 'all'];
  if (!count) return `${none} em ${projectName}.`;
  return `${count} ${count === 1 ? one : many} em ${projectName}. Clique no cabeçalho de uma coluna para ordenar.`;
}
