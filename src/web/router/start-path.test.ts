import { describe, expect, it } from 'vitest';
import type { Project } from '../lib/types';
import { emptyNavState, type NavState, parseNavState } from './last-location';
import { resolveStartPath } from './start-path';

const project = (id: string, position: number, archived = false): Project => ({
  id,
  name: id,
  color: 'violet',
  position,
  version: 1,
  archivedAt: archived ? '2026-10-30T12:00:00.000Z' : null,
  createdAt: '2026-10-29T12:00:00.000Z',
  updatedAt: '2026-10-29T12:00:00.000Z',
});
const at = '2026-10-31T12:00:00.000Z';
const visited = (lastProjectId: string, path: string, scrollTop = 0): NavState => ({
  version: 1,
  lastProjectId,
  projects: { [lastProjectId]: { path, scrollTop, at } },
});

describe('resolveStartPath', () => {
  it('reopens the last active project where it was, with its scroll', () => {
    const projects = [project('a', 0), project('b', 1)];
    expect(resolveStartPath(visited('b', '/projetos/b/documentos/d', 840), projects)).toEqual({
      path: '/projetos/b/documentos/d',
      scrollTop: 840,
    });
  });

  it('opens the Visão geral of the first active project when the last one is archived', () => {
    const projects = [project('old', 0, true), project('z', 2), project('a', 1)];
    expect(resolveStartPath(visited('old', '/projetos/old/quadro'), projects)).toEqual({
      path: '/projetos/a',
      scrollTop: 0,
    });
  });

  it('opens the empty state when every project is archived, or there is none', () => {
    expect(resolveStartPath(visited('old', '/projetos/old'), [project('old', 0, true)]).path).toBe('/projetos');
    expect(resolveStartPath(emptyNavState(), []).path).toBe('/projetos');
  });

  it('opens the Visão geral when the stored path was invalid and got dropped', () => {
    const state = parseNavState(
      JSON.stringify({
        version: 1,
        lastProjectId: 'a',
        projects: { a: { path: '/projetos/b/quadro', scrollTop: 5, at } },
      }),
    );
    expect(resolveStartPath(state, [project('a', 0)])).toEqual({ path: '/projetos/a', scrollTop: 0 });
  });

  it('falls back to the first active project when the last one no longer exists', () => {
    expect(resolveStartPath(visited('gone', '/projetos/gone'), [project('a', 0)]).path).toBe('/projetos/a');
  });
});
