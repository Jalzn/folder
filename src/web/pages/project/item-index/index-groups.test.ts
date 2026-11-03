import { describe, expect, it } from 'vitest';
import { toIsoInstant } from '#core/domain';
import {
  filterByFolder,
  folderFilterName,
  folderNameOf,
  indexGroups,
  knownFolderFilter,
  NO_FOLDER,
} from './index-groups';
import type { IndexRow } from './index-rows';

const row = (id: string, folderId: string | null): IndexRow => ({
  key: `document:${id}`,
  type: 'document',
  id,
  title: id,
  excerpt: '',
  updatedAt: toIsoInstant(new Date('2026-10-31T10:00:00Z')),
  folderId,
});
const folders = [
  { id: 'mcp', name: 'MCP' },
  { id: 'arq', name: 'Arquitetura' },
  { id: 'vazia', name: 'Vazia' },
];
// In the table's order; "x" names a folder that is no longer active.
const rows = [row('a', 'arq'), row('b', null), row('c', 'mcp'), row('d', 'arq'), row('e', 'x')];
const ids = (list: IndexRow[]) => list.map((each) => each.id);

describe('knownFolderFilter', () => {
  it('keeps "raiz" and an active folder, and drops an unknown or deleted one', () => {
    expect(knownFolderFilter(undefined, folders)).toBeUndefined();
    expect(knownFolderFilter('raiz', folders)).toBe('raiz');
    expect(knownFolderFilter('mcp', folders)).toBe('mcp');
    expect(knownFolderFilter('apagada', folders)).toBeUndefined();
  });
});

describe('filterByFolder', () => {
  it('keeps every row, the root ones (with a folder that is gone) or one folder', () => {
    expect(ids(filterByFolder(rows, undefined, folders))).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(ids(filterByFolder(rows, 'raiz', folders))).toEqual(['b', 'e']);
    expect(ids(filterByFolder(rows, 'arq', folders))).toEqual(['a', 'd']);
    expect(filterByFolder(rows, 'vazia', folders)).toEqual([]);
  });
});

describe('indexGroups', () => {
  it('groups by folder in the manual order, "Sem pasta" last, keeping each group in the table order', () => {
    const groups = indexGroups(rows, folders);
    expect(groups.map((group) => [group.key, group.label, ids(group.rows)])).toEqual([
      ['folder:mcp', 'MCP', ['c']],
      ['folder:arq', 'Arquitetura', ['a', 'd']],
      ['root', NO_FOLDER, ['b', 'e']],
    ]);
    expect(groups[0]?.folder).toEqual({ id: 'mcp', name: 'MCP' });
    expect(groups[2]?.folder).toBeNull();
  });

  it('leaves out the empty groups, "Sem pasta" too', () => {
    expect(indexGroups([row('a', 'mcp')], folders).map((group) => group.key)).toEqual(['folder:mcp']);
    expect(indexGroups([], folders)).toEqual([]);
  });
});

describe('folder names', () => {
  it('names a row\'s folder, or "Sem pasta"', () => {
    expect(folderNameOf(row('a', 'arq'), folders)).toBe('Arquitetura');
    expect(folderNameOf(row('b', null), folders)).toBe(NO_FOLDER);
    expect(folderNameOf(row('e', 'x'), folders)).toBe(NO_FOLDER);
  });

  it('names the filter for the summary', () => {
    expect(folderFilterName(undefined, folders)).toBeUndefined();
    expect(folderFilterName('raiz', folders)).toBe(NO_FOLDER);
    expect(folderFilterName('mcp', folders)).toBe('MCP');
  });
});
