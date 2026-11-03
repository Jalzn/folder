import { describe, expect, it } from 'vitest';
import { documentToMarkdown } from '#rich-text/domain';
import type { EmbeddedItems } from './embed-items.js';
import { embedResolver } from './embed-resolver.js';

const project = { id: 'p1', name: 'Tinyfold', color: 'violet' as const, archived: false };
const items: EmbeddedItems = {
  tasks: [
    {
      state: 'live',
      id: 't1',
      title: 'Gerar token pessoal no Perfil',
      version: 1,
      column: { id: 'c1', name: 'Em andamento', isDone: false },
      dueOn: null,
      completedAt: null,
      labels: [],
      checklist: null,
      project,
    },
    { state: 'trashed', id: 't2', title: 'Na lixeira', version: 2 },
    { state: 'missing', id: 't3' },
  ],
  drawings: [
    {
      state: 'live',
      id: 'd1',
      title: 'Navegação',
      version: 1,
      project,
      folder: null,
      preview: null,
      empty: false,
    },
    { state: 'trashed', id: 'd2', title: 'Antigo', version: 3 },
  ],
};

describe('embed resolver', () => {
  const resolver = embedResolver(items, (kind, id) => `https://tinyfold.example/${kind}/${id}`);

  it('gives a live task its title and column, a live drawing its title, and nothing for the others', () => {
    expect(resolver.resolve('task', 't1')).toEqual({ title: 'Gerar token pessoal no Perfil', column: 'Em andamento' });
    expect(resolver.resolve('drawing', 'd1')).toEqual({ title: 'Navegação' });
    for (const [kind, id] of [
      ['task', 't2'],
      ['task', 't3'],
      ['task', 'unknown'],
      ['drawing', 'd2'],
      ['drawing', 't1'],
    ] as const)
      expect(resolver.resolve(kind, id)).toBeNull();
    expect(resolver.href('task', 't1')).toBe('https://tinyfold.example/task/t1');
  });

  it('writes what the serializer shows, with the caller’s links', () => {
    const block = (type: string, prop: string, id: string) => ({ type, props: { [prop]: id }, children: [] });
    expect(
      documentToMarkdown([block('taskEmbed', 'taskId', 't1'), block('drawingEmbed', 'canvasId', 'd2')], {
        embeds: resolver,
      }),
    ).toBe(
      '[Tarefa: Gerar token pessoal no Perfil (Em andamento)](https://tinyfold.example/task/t1)\n\n[Item indisponível]\n',
    );
  });
});
