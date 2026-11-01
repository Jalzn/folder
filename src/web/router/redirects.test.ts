import { describe, expect, it } from 'vitest';
import type { Project } from '../lib/types';
import { isAppPath, parseProjectPath, paths, safeDecode } from './paths';
import {
  itemRedirectPath,
  type LegacyAddress,
  listRedirectPath,
  listRedirectProject,
  parseLegacyAddress,
} from './redirects';

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

describe('legacy addresses', () => {
  it.each<[string, Record<string, unknown>, LegacyAddress | null]>([
    ['/login', {}, { kind: 'login' }],
    ['/kanban', {}, { kind: 'list', target: 'board' }],
    ['/lixeira', {}, { kind: 'list', target: 'trash' }],
    ['/documentos', { q: 'ideia' }, { kind: 'list', target: 'documents' }],
    ['/desenhos', { q: 'fluxo' }, { kind: 'list', target: 'drawings' }],
    ['/documentos/d1', { bloco: 'b7' }, { kind: 'document', id: 'd1', block: 'b7' }],
    ['/documentos/d1', {}, { kind: 'document', id: 'd1', block: null }],
    ['/desenhos/c1', {}, { kind: 'drawing', id: 'c1' }],
    ['/documentos/d1/extra', {}, null],
    ['/perfil', {}, null],
    ['/projetos/p1', {}, null],
  ])('reads %s', (pathname, search, expected) => {
    expect(parseLegacyAddress(pathname, search)).toEqual(expected);
  });

  it('sends an old list to the last project, even archived, or to the first active one', () => {
    const projects = [project('a', 0), project('b', 1), project('old', 2, true)];
    expect(listRedirectProject(projects, 'old')).toBe('old');
    expect(listRedirectProject(projects, 'b')).toBe('b');
    expect(listRedirectProject(projects, 'gone')).toBe('a');
    expect(listRedirectProject(projects, null)).toBe('a');
    expect(listRedirectProject([project('old', 0, true)], null)).toBeNull();
    expect(listRedirectProject([], 'gone')).toBeNull();
  });

  it('turns each old list into the project page that replaced it', () => {
    expect(listRedirectPath('documents', 'p')).toBe('/projetos/p/indice?tipo=documentos');
    expect(listRedirectPath('drawings', 'p')).toBe('/projetos/p/indice?tipo=desenhos');
    expect(listRedirectPath('board', 'p')).toBe('/projetos/p/quadro');
    expect(listRedirectPath('trash', 'p')).toBe('/projetos/p/lixeira');
    expect(listRedirectPath('documents', null)).toBe('/projetos');
  });

  it("writes the Índice's filters into its address", () => {
    expect(paths.index('p')).toBe('/projetos/p/indice');
    expect(paths.index('p', { pasta: 'raiz' })).toBe('/projetos/p/indice?pasta=raiz');
    expect(paths.index('p', { tipo: 'desenhos', pasta: 'f1' })).toBe('/projetos/p/indice?tipo=desenhos&pasta=f1');
  });

  it('moves an old item address under its project, keeping the block', () => {
    expect(itemRedirectPath({ kind: 'document', id: 'd1', block: 'b7' }, 'p')).toBe(
      '/projetos/p/documentos/d1?bloco=b7',
    );
    expect(itemRedirectPath({ kind: 'document', id: 'd1', block: null }, 'p')).toBe('/projetos/p/documentos/d1');
    expect(itemRedirectPath({ kind: 'drawing', id: 'c1' }, 'p')).toBe('/projetos/p/desenhos/c1');
  });
});

describe('project paths', () => {
  it('writes the Concluídas address under its project', () => {
    expect(paths.completed('p')).toBe('/projetos/p/concluidas');
    expect(paths.completed('a b')).toBe('/projetos/a%20b/concluidas');
  });

  it('reads the project and the item of an address', () => {
    expect(parseProjectPath(paths.overview('p'))).toEqual({ projectId: 'p', item: null });
    expect(parseProjectPath(paths.index('p', { tipo: 'desenhos' }))).toEqual({ projectId: 'p', item: null });
    for (const page of [paths.board('p'), paths.trash('p'), paths.completed('p')])
      expect(parseProjectPath(page), page).toEqual({ projectId: 'p', item: null });
    expect(parseProjectPath(paths.document('p', 'd', 'b'))).toEqual({
      projectId: 'p',
      item: { type: 'document', id: 'd' },
    });
    expect(parseProjectPath(paths.drawing('p', 'c'))).toEqual({ projectId: 'p', item: { type: 'drawing', id: 'c' } });
    expect(parseProjectPath('/projetos')).toBeNull();
    expect(parseProjectPath('/projetos/p/outra')).toBeNull();
    expect(parseProjectPath('/projetos/p/concluidas/x')).toBeNull();
    expect(parseProjectPath('/perfil')).toBeNull();
  });

  it('refuses hostile and broken addresses instead of throwing', () => {
    for (const path of [
      '/projetos/%E0%A4%A',
      '/projetos/p/documentos/%E0%A4%A',
      'x/projetos/p',
      'https:evil.example/projetos/p',
      '//evil.example/projetos/p',
      '/\\evil.example/projetos/p',
      '/projetos\\p',
      'projetos/p',
      '',
    ])
      expect(parseProjectPath(path), path).toBeNull();
  });
});

describe('app paths', () => {
  it('accepts only the app’s own routes, with one leading slash', () => {
    expect(isAppPath('/')).toBe(true);
    expect(isAppPath('/perfil')).toBe(true);
    expect(isAppPath('/projetos')).toBe(true);
    expect(isAppPath('/projetos/p/indice?tipo=documentos')).toBe(true);
    expect(isAppPath('/projetos/p/concluidas')).toBe(true);
    expect(isAppPath('/projetos/p/documentos/d?bloco=b')).toBe(true);
    for (const path of [
      'https:evil.example/projetos/p',
      '//evil.example/projetos/p',
      '/\\evil.example',
      'javascript:alert(1)',
      '/qualquer-coisa',
      '/projetos/%E0%A4%A',
    ])
      expect(isAppPath(path), path).toBe(false);
  });
});

describe('safe decoding', () => {
  it('reads an encoded segment, and a broken one as null', () => {
    expect(safeDecode('Ol%C3%A1')).toBe('Olá');
    expect(safeDecode('%E0%A4%A')).toBeNull();
  });
});
