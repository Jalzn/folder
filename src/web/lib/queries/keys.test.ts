import { describe, expect, it } from 'vitest';
import { keys } from './keys';

describe('keys', () => {
  it('makes the keys the queries used before the factory', () => {
    expect(keys.all).toEqual(['workspace']);
    expect(keys.session).toEqual(['session']);
    expect(keys.document('d')).toEqual(['workspace', 'document', 'd']);
    expect(keys.canvas('c')).toEqual(['workspace', 'canvas', 'c']);
    expect(keys.documents({ projectId: 'p' })).toEqual(['workspace', 'documents', { projectId: 'p' }]);
    expect(keys.canvases({})).toEqual(['workspace', 'canvases', {}]);
    expect(keys.projects(true)).toEqual(['workspace', 'projects', true]);
    expect(keys.navigation('p', 'recent')).toEqual(['workspace', 'navigation', 'p', 'recent']);
    expect(keys.navigation(null, 'recent')).toEqual(['workspace', 'navigation', null, 'recent']);
    expect(keys.overview('p')).toEqual(['workspace', 'overview', 'p']);
    expect(keys.search({ query: 'x' })).toEqual(['workspace', 'search', { query: 'x' }]);
    expect(keys.tasks({})).toEqual(['workspace', 'tasks', {}]);
    expect(keys.task('t')).toEqual(['workspace', 'task', 't']);
    expect(keys.board('p')).toEqual(['workspace', 'board', 'p']);
    expect(keys.completed('p')).toEqual(['workspace', 'completed', 'p']);
    expect(keys.columns).toEqual(['workspace', 'columns']);
    expect(keys.labels).toEqual(['workspace', 'labels']);
    expect(keys.folders('p')).toEqual(['workspace', 'folders', 'p']);
    expect(keys.folders('all')).toEqual(['workspace', 'folders', 'all']);
    expect(keys.trash('p')).toEqual(['workspace', 'trash', 'p']);
    expect(keys.embeds('d', { taskIds: ['t'], canvasIds: [] })).toEqual(['workspace', 'embeds', 'd', ['t'], []]);
  });

  it('gives the prefix of every query below a key without its last arguments', () => {
    expect(keys.navigation()).toEqual(['workspace', 'navigation']);
    expect(keys.navigation('p')).toEqual(['workspace', 'navigation', 'p']);
    expect(keys.overview()).toEqual(['workspace', 'overview']);
    expect(keys.documents()).toEqual(['workspace', 'documents']);
    expect(keys.canvases()).toEqual(['workspace', 'canvases']);
    expect(keys.tasks()).toEqual(['workspace', 'tasks']);
    expect(keys.board()).toEqual(['workspace', 'board']);
    expect(keys.search()).toEqual(['workspace', 'search']);
    expect(keys.embeds()).toEqual(['workspace', 'embeds']);
  });

  it('keys an open item by its contract type: a drawing is a canvas', () => {
    expect(keys.item('document', 'x')).toEqual(['workspace', 'document', 'x']);
    expect(keys.item('drawing', 'x')).toEqual(['workspace', 'canvas', 'x']);
  });
});
