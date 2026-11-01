import { describe, expect, it } from 'vitest';
import type { Project } from '../../lib/types';
import { emptyNavState, type NavState } from '../../router/last-location';
import { copyDestination, copyFolder, redirectedCopyText } from './copy-destination';

const project = (id: string, position: number, archived = false) =>
  ({
    id,
    name: id,
    color: 'gray',
    position,
    archivedAt: archived ? '2026-10-01T00:00:00Z' : null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }) as unknown as Project;
const projects = [project('a', 0), project('b', 1), project('old', 0, true)];
const visited = (entries: Record<string, string>): NavState => ({
  ...emptyNavState(),
  projects: Object.fromEntries(
    Object.entries(entries).map(([id, at]) => [id, { path: `/projetos/${id}`, scrollTop: 0, at }]),
  ),
});

describe('copyDestination', () => {
  it('keeps the copy in its own project while that project is active', () => {
    expect(copyDestination(projects, 'b', emptyNavState())).toEqual({ project: projects[1], redirected: false });
  });

  it('sends a copy from an archived project to the active project opened last on this device', () => {
    const nav = visited({ a: '2026-10-20T10:00:00Z', b: '2026-10-30T10:00:00Z', old: '2026-10-31T10:00:00Z' });
    expect(copyDestination(projects, 'old', nav)).toEqual({ project: projects[1], redirected: true });
  });

  it('falls back on the first project of the selector, and on nothing without an active project', () => {
    expect(copyDestination(projects, 'old', emptyNavState())?.project.id).toBe('a');
    expect(copyDestination([project('old', 0, true)], 'old', emptyNavState())).toBeNull();
  });
});

describe('redirectedCopyText', () => {
  it('names where the copy went and why', () => {
    expect(redirectedCopyText('Geral', 'Site pessoal')).toBe(
      'Cópia criada em Geral, porque Site pessoal está arquivado.',
    );
    expect(redirectedCopyText('Geral', undefined)).toBe('Cópia criada em Geral.');
    expect(redirectedCopyText('Geral', 'Site pessoal', 'Importado')).toBe(
      'Importado em Geral, porque Site pessoal está arquivado.',
    );
  });
});

describe('copyFolder', () => {
  const [a, b] = projects as [Project, Project];
  it("keeps a copy in the item's folder in its own project, and at the root anywhere else", () => {
    expect(copyFolder({ projectId: 'a', folderId: 'f1' }, { project: a, redirected: false })).toBe('f1');
    expect(copyFolder({ projectId: 'a', folderId: null }, { project: a, redirected: false })).toBeUndefined();
    expect(copyFolder({ projectId: 'old', folderId: 'f1' }, { project: b, redirected: true })).toBeUndefined();
    expect(copyFolder({ projectId: 'a', folderId: 'f1' }, { project: b, redirected: false })).toBeUndefined();
  });
});
