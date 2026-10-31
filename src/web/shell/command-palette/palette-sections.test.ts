import { describe, expect, it } from 'vitest';
import type { SearchResult } from '../../lib/queries';
import type { Project } from '../../lib/types';
import { availableCommands, type CommandContext } from './commands';
import { paletteSections } from './palette-sections';

const project = (id: string, name: string, archived = false) =>
  ({ id, name, color: 'gray', position: 0, archivedAt: archived ? '2026-10-01T00:00:00Z' : null }) as Project;
const context: CommandContext = {
  project: { name: 'Tinyfold', archived: false },
  hasActiveProject: true,
  theme: 'dark',
  sidebarCollapsed: false,
  canSave: true,
};
const results = [
  {
    type: 'document',
    id: 'd1',
    title: 'Visão do produto',
    projectId: 'p1',
    projectName: 'Tinyfold',
    projectArchived: false,
    updatedAt: 'now',
    pinned: false,
    excerpt: 'Um espaço pessoal…',
  },
  {
    type: 'task',
    id: 't1',
    title: '',
    status: 'doing',
    projectId: 'p1',
    projectName: 'Tinyfold',
    projectArchived: false,
    updatedAt: 'now',
  },
] as unknown as SearchResult[];
const here = [
  { id: 'export', label: 'Exportar Markdown' },
  { id: 'pin', label: 'Fixar', shortcut: ['P'] },
  { id: 'move', label: 'Mover para projeto…', shortcut: ['M'] },
  { id: 'trash', label: 'Mover para a lixeira' },
];
const projects = [project('p1', 'Tinyfold'), project('p2', 'Reforma do escritório'), project('p3', 'Site', true)];
const input = (query: string) => ({ query, here, results, projects, commands: availableCommands(context) });

describe('palette sections', () => {
  it('opens with the item, the items edited last without excerpts, and the commands', () => {
    const sections = paletteSections(input(''));
    expect(sections.map((section) => section.title)).toEqual(['Neste item', 'Editados recentemente', 'Comandos']);
    expect(sections[0]?.rows.map((row) => row.key)).toEqual(['here:export', 'here:pin', 'here:move', 'here:trash']);
    expect(sections[1]?.rows.map((row) => row.excerpt)).toEqual([undefined, undefined]);
    expect(sections[1]?.rows[1]).toMatchObject({ label: 'Sem título', status: 'doing', key: 'item:task:t1' });
  });

  it('with text, filters the item and the commands, lists matching projects and shows excerpts', () => {
    const sections = paletteSections(input('reforma'));
    expect(sections.map((section) => section.id)).toEqual(['items', 'projects']);
    expect(sections[0]?.title).toBe('Itens');
    expect(sections[0]?.rows[0]?.excerpt).toBe('Um espaço pessoal…');
    expect(sections[1]?.rows).toEqual([
      expect.objectContaining({ key: 'project:p2', action: { kind: 'project', id: 'p2', unarchive: false } }),
    ]);
    expect(paletteSections(input('lixeira'))[0]?.rows.map((row) => row.key)).toEqual(['here:trash']);
  });

  it('without an active project, offers to unarchive the archived ones', () => {
    const archived = [project('p3', 'Site', true)];
    const sections = paletteSections({ query: '', here: [], results: [], projects: archived, commands: [] });
    expect(sections).toEqual([
      {
        id: 'projects',
        title: 'Projetos',
        rows: [
          expect.objectContaining({
            label: 'Desarquivar Site',
            action: { kind: 'project', id: 'p3', unarchive: true },
          }),
        ],
      },
    ]);
  });

  it('gives every row one key', () => {
    const keys = paletteSections(input('')).flatMap((section) => section.rows.map((row) => row.key));
    expect(new Set(keys).size).toBe(keys.length);
  });
});
