import type { IsoInstant } from '@tinyfold/core/domain';
import { toIsoInstant } from '@tinyfold/core/domain';
import { describe, expect, it } from 'vitest';
import {
  defaultIndexSort,
  type IndexRow,
  indexRows,
  indexSummary,
  nextIndexSort,
  parseIndexView,
  sortIndexRows,
} from './index-rows';

const listed = (id: string, title: string, updatedAt: IsoInstant, folderId: string | null = null) => ({
  id,
  title,
  plainText: `${title}…`,
  updatedAt,
  folderId,
});
const documents = [
  listed('d1', 'Visão do produto', toIsoInstant(new Date('2026-10-31T10:00:00Z'))),
  listed('d2', 'Árvore', toIsoInstant(new Date('2026-10-20T10:00:00Z')), 'f1'),
];
const drawings = [
  listed('c1', 'Fluxo', toIsoInstant(new Date('2026-10-25T10:00:00Z'))),
  listed('c2', '', toIsoInstant(new Date('2026-10-31T12:00:00Z'))),
];
const keys = (rows: IndexRow[]) => rows.map((row) => row.key);

describe('indexRows', () => {
  it('joins documents and drawings, or keeps the type the filter asks for', () => {
    expect(keys(indexRows(documents, drawings))).toEqual(['document:d1', 'document:d2', 'drawing:c1', 'drawing:c2']);
    expect(keys(indexRows(documents, drawings, 'documentos'))).toEqual(['document:d1', 'document:d2']);
    expect(keys(indexRows(documents, drawings, 'desenhos'))).toEqual(['drawing:c1', 'drawing:c2']);
    expect(indexRows(documents, [])[0]).toMatchObject({
      type: 'document',
      excerpt: 'Visão do produto…',
      folderId: null,
    });
    expect(indexRows(documents, [])[1]?.folderId).toBe('f1');
  });

  it('cuts the excerpt as the Visão geral does: one line, its pieces joined, an ellipsis when it goes on', () => {
    const text = (plainText: string) => indexRows([{ ...documents[0], plainText } as never], [])[0]?.excerpt;
    expect(text('Por que existe\nUm espaço   para  pensar')).toBe('Por que existe, Um espaço para pensar');
    expect(text('Primeiro.\nSegundo')).toBe('Primeiro. Segundo');
    // A summary stops at 280 characters, so a text that long goes on after it.
    const long = 'a'.repeat(280);
    expect(text(long)).toBe(`${'a'.repeat(239)}…`);
    expect(text('curto')).toBe('curto');
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

describe('parseIndexView', () => {
  it('reads a stored order, the one stage 08 kept too, and falls back on anything else', () => {
    expect(parseIndexView('{"column":"title","direction":"descending"}')).toEqual({
      sort: { column: 'title', direction: 'descending' },
      grouped: true,
    });
    expect(parseIndexView(null)).toEqual({ sort: defaultIndexSort, grouped: true });
    expect(parseIndexView('{"column":"links","direction":"up"}').sort).toEqual(defaultIndexSort);
    expect(parseIndexView('{')).toEqual({ sort: defaultIndexSort, grouped: true });
  });

  it('groups by folder unless it was turned off', () => {
    expect(parseIndexView('{"column":"title","direction":"ascending","grouped":false}')).toEqual({
      sort: { column: 'title', direction: 'ascending' },
      grouped: false,
    });
    expect(parseIndexView('{"grouped":"no"}').grouped).toBe(true);
    expect(parseIndexView('null').grouped).toBe(true);
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

  it('names the folder of the filter after the project', () => {
    expect(indexSummary(12, 'Tinyfold', undefined, 'MCP')).toBe(
      '12 itens em Tinyfold · MCP. Clique no cabeçalho de uma coluna para ordenar.',
    );
    expect(indexSummary(0, 'Tinyfold', 'documentos', 'Sem pasta')).toBe('Nenhum documento em Tinyfold · Sem pasta.');
  });
});
