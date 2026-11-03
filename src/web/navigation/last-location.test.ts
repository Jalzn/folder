import { describe, expect, it } from 'vitest';
import { emptyNavState, navStorageKey, parseNavState, recordPath, recordScroll } from './last-location';

const at = '2026-10-31T12:00:00.000Z';

describe('last location', () => {
  it('is kept per installation', () => {
    expect(navStorageKey('inst-1')).toBe('tinyfold:inst-1:nav');
  });

  it('reads the stored format', () => {
    const raw = JSON.stringify({
      version: 1,
      lastProjectId: 'p',
      projects: { p: { path: '/projetos/p/documentos/d', scrollTop: 840, at } },
    });
    expect(parseNavState(raw)).toEqual({
      version: 1,
      lastProjectId: 'p',
      projects: { p: { path: '/projetos/p/documentos/d', scrollTop: 840, at } },
    });
  });

  it('starts empty from nothing, broken JSON or another version', () => {
    expect(parseNavState(null)).toEqual(emptyNavState());
    expect(parseNavState('{')).toEqual(emptyNavState());
    expect(parseNavState('[]')).toEqual(emptyNavState());
    expect(parseNavState(JSON.stringify({ version: 2, lastProjectId: 'p', projects: {} }))).toEqual(emptyNavState());
  });

  it('drops invalid entries and keeps the valid ones', () => {
    const raw = JSON.stringify({
      version: 1,
      lastProjectId: 7,
      projects: {
        p: { path: '/projetos/p/quadro', scrollTop: -3, at },
        q: { path: '/projetos/p/quadro', scrollTop: 10, at },
        r: { path: 'https://example.com', scrollTop: 0, at },
        s: { path: '/projetos/s', scrollTop: 'x' },
        t: 'nada',
      },
    });
    expect(parseNavState(raw)).toEqual({
      version: 1,
      lastProjectId: null,
      projects: {
        p: { path: '/projetos/p/quadro', scrollTop: 0, at },
        s: { path: '/projetos/s', scrollTop: 0, at: new Date(0).toISOString() },
      },
    });
  });

  it('drops a stored path that would leave the app or break on decoding', () => {
    const hostile = [
      'https:evil.example/projetos/h',
      '//evil.example/projetos/h',
      'x/projetos/h',
      '/\\evil.example/projetos/h',
      '/projetos/%E0%A4%A',
    ];
    const raw = JSON.stringify({
      version: 1,
      lastProjectId: 'h',
      projects: Object.fromEntries(
        hostile.map((path, index) => [index === 4 ? '%E0%A4%A' : 'h', { path, scrollTop: 0, at }]),
      ),
    });
    expect(parseNavState(raw).projects).toEqual({});
  });

  it('records a navigation as the last project and starts a new path at the top', () => {
    let state = recordPath(emptyNavState(), 'p', '/projetos/p/documentos/d', at);
    state = recordScroll(state, 'p', '/projetos/p/documentos/d', 840.4);
    expect(state.projects.p).toEqual({ path: '/projetos/p/documentos/d', scrollTop: 840, at });
    expect(recordPath(state, 'p', '/projetos/p/documentos/d', at).projects.p?.scrollTop).toBe(840);
    const moved = recordPath(state, 'p', '/projetos/p/quadro', at);
    expect(moved.projects.p?.scrollTop).toBe(0);
    expect(recordPath(moved, 'q', '/projetos/q', at).lastProjectId).toBe('q');
  });

  it('ignores a path outside the project and a scroll of another page', () => {
    const state = recordPath(emptyNavState(), 'p', '/projetos/p', at);
    expect(recordPath(state, 'p', '/projetos/q', at)).toBe(state);
    expect(recordScroll(state, 'p', '/projetos/p/quadro', 300)).toBe(state);
    expect(recordScroll(state, 'q', '/projetos/q', 300)).toBe(state);
  });
});
