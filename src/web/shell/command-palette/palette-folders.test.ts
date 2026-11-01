import { describe, expect, it } from 'vitest';
import type { Project } from '../../lib/types';
import { folderRows, PALETTE_FOLDERS } from './palette-folders';

const project = (id: string, name: string, archived = false) =>
  ({ id, name, color: 'gray', position: 0, archivedAt: archived ? '2026-10-01T00:00:00Z' : null }) as Project;
const projects = [project('p1', 'Tinyfold'), project('p2', 'Antigo', true)];
const folder = (id: string, projectId: string, name: string, items: number) => ({ id, projectId, name, items });
const folders = [
  folder('f1', 'p1', 'MCP', 12),
  folder('f2', 'p1', 'Arquitetura', 1),
  folder('f3', 'p2', 'Ações do MCP', 0),
  folder('f4', 'gone', 'MCP perdido', 3),
];

describe('folderRows', () => {
  it('shows nothing before a word is typed', () => {
    expect(folderRows('', folders, projects)).toEqual([]);
    expect(folderRows('   ', folders, projects)).toEqual([]);
  });

  it('keeps the folders whose name holds every word, accents and case aside, with their project', () => {
    const rows = folderRows('mcp', folders, projects);
    expect(rows.map((row) => row.key)).toEqual(['folder:f1', 'folder:f3']);
    expect(rows[0]).toMatchObject({
      label: 'MCP',
      note: 'pasta · 12 itens',
      action: { kind: 'folder', id: 'f1', projectId: 'p1' },
      archived: false,
      project: { id: 'p1', name: 'Tinyfold' },
    });
    // A folder of an archived project is marked; one of a project the list lacks is left out.
    expect(rows[1]).toMatchObject({ note: 'pasta · 0 itens', archived: true, project: { name: 'Antigo' } });
    expect(folderRows('acoes mcp', folders, projects).map((row) => row.key)).toEqual(['folder:f3']);
    expect(folderRows('arq', folders, projects)[0]?.note).toBe('pasta · 1 item');
  });

  it('stops at six', () => {
    const many = Array.from({ length: 9 }, (_, index) => folder(`m${index}`, 'p1', `Pasta ${index}`, index));
    expect(folderRows('pasta', many, projects)).toHaveLength(PALETTE_FOLDERS);
  });
});
