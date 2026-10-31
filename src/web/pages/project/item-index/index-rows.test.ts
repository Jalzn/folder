import { describe, expect, it } from 'vitest';
import {
  defaultIndexSort,
  type IndexRow,
  indexRows,
  indexSummary,
  nextIndexSort,
  parseIndexSort,
  sortIndexRows,
} from './index-rows';

const listed = (id: string, title: string, updatedAt: string) => ({ id, title, plainText: `${title}…`, updatedAt });
const documents = [
  listed('d1', 'Visão do produto', '2026-10-31T10:00:00Z'),
  listed('d2', 'Árvore', '2026-10-20T10:00:00Z'),
];
const drawings = [listed('c1', 'Fluxo', '2026-10-25T10:00:00Z'), listed('c2', '', '2026-10-31T12:00:00Z')];
const keys = (rows: IndexRow[]) => rows.map((row) => row.key);

describe('indexRows', () => {
  it('joins documents and drawings, or keeps the type the filter asks for', () => {
    expect(keys(indexRows(documents, drawings))).toEqual(['document:d1', 'document:d2', 'drawing:c1', 'drawing:c2']);
    expect(keys(indexRows(documents, drawings, 'documentos'))).toEqual(['document:d1', 'document:d2']);
    expect(keys(indexRows(documents, drawings, 'desenhos'))).toEqual(['drawing:c1', 'drawing:c2']);
    expect(indexRows(documents, [])[0]).toMatchObject({ type: 'document', excerpt: 'Visão do produto…' });
  });
});

describe('sortIndexRows', () => {
  const rows = indexRows(documents, drawings);

  it('puts the last edited first by default', () => {
    expect(keys(sortIndexRows(rows, defaultIndexSort))).toEqual([
      'drawing:c2',
      'document:d1',
      'drawing:c1',
      'document:d2',
    ]);
  });

  it('sorts titles in Portuguese, accents and untitled included', () => {
    const sorted = sortIndexRows(rows, { column: 'title', direction: 'ascending' });
    expect(sorted.map((row) => row.title || 'Sem título')).toEqual([
      'Árvore',
      'Fluxo',
      'Sem título',
      'Visão do produto',
    ]);
  });

  it('groups by type, newest first inside each type, either way round', () => {
    expect(keys(sortIndexRows(rows, { column: 'type', direction: 'ascending' }))).toEqual([
      'drawing:c2',
      'drawing:c1',
      'document:d1',
      'document:d2',
    ]);
    expect(keys(sortIndexRows(rows, { column: 'type', direction: 'descending' }))).toEqual([
      'document:d1',
      'document:d2',
      'drawing:c2',
      'drawing:c1',
    ]);
  });
});

describe('nextIndexSort', () => {
  it('turns the same column around and starts a new one in its natural order', () => {
    expect(nextIndexSort(defaultIndexSort, 'updatedAt')).toEqual({ column: 'updatedAt', direction: 'ascending' });
    expect(nextIndexSort(defaultIndexSort, 'title')).toEqual({ column: 'title', direction: 'ascending' });
    expect(nextIndexSort({ column: 'title', direction: 'ascending' }, 'type')).toEqual({
      column: 'type',
      direction: 'descending',
    });
  });
});

describe('parseIndexSort', () => {
  it('reads a stored order and falls back on anything else', () => {
    expect(parseIndexSort('{"column":"title","direction":"descending"}')).toEqual({
      column: 'title',
      direction: 'descending',
    });
    expect(parseIndexSort(null)).toEqual(defaultIndexSort);
    expect(parseIndexSort('{"column":"links","direction":"up"}')).toEqual(defaultIndexSort);
    expect(parseIndexSort('{')).toEqual(defaultIndexSort);
  });
});

describe('indexSummary', () => {
  it('counts the items of the filter in the project', () => {
    expect(indexSummary(12, 'Tinyfold')).toBe('12 itens em Tinyfold. Clique no cabeçalho de uma coluna para ordenar.');
    expect(indexSummary(1, 'Tinyfold', 'documentos')).toBe(
      '1 documento em Tinyfold. Clique no cabeçalho de uma coluna para ordenar.',
    );
    expect(indexSummary(0, 'Tinyfold', 'desenhos')).toBe('Nenhum desenho em Tinyfold.');
  });
});
