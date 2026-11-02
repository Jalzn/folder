import type { EmbeddedDrawing, EmbeddedTask } from '@tinyfold/workspace/domain';
import { describe, expect, it } from 'vitest';
import { embedText } from './embed-text';

const project = { id: 'p1', name: 'Tinyfold', color: 'violet', archived: false } as const;
const TASK = '0b4f2a4e-8f8c-4a5e-9d55-1f2a3b4c5d6e';
const CANVAS = '7c1e9a20-3b4d-4e5f-8a6b-7c8d9e0f1a2b';
const origin = 'https://tinyfold.example';

const task: EmbeddedTask = {
  state: 'live',
  id: TASK,
  title: 'Gerar token [pessoal]',
  version: 3,
  column: { id: 'c2', name: 'Em andamento', isDone: false },
  dueOn: null,
  completedAt: null,
  labels: [],
  checklist: null,
  project,
};
const drawing: EmbeddedDrawing = {
  state: 'live',
  id: CANVAS,
  title: 'Fluxo do autosave',
  version: 2,
  project,
  folder: null,
  preview: null,
  empty: false,
};

describe('embedText', () => {
  it('reads a card as "Tarefa: título (coluna)", linked as the exported file links it', () => {
    expect(embedText('task', TASK, task, origin)).toEqual({
      plain: 'Tarefa: Gerar token [pessoal] (Em andamento)',
      markdown: `[Tarefa: Gerar token \\[pessoal\\] (Em andamento)](${origin}/tarefas/${TASK})`,
      link: { href: `${origin}/tarefas/${TASK}`, label: 'Tarefa: Gerar token [pessoal] (Em andamento)' },
    });
  });

  it('reads a figure as "Desenho: título"', () => {
    expect(embedText('drawing', CANVAS, drawing, origin)).toEqual({
      plain: 'Desenho: Fluxo do autosave',
      markdown: `[Desenho: Fluxo do autosave](${origin}/desenhos/${CANVAS})`,
      link: { href: `${origin}/desenhos/${CANVAS}`, label: 'Desenho: Fluxo do autosave' },
    });
  });

  it('reads an item in the trash, gone or not resolved yet as unavailable, with no link', () => {
    const unavailable = { plain: 'Item indisponível', markdown: '[Item indisponível]', link: null };
    expect(embedText('task', TASK, { state: 'trashed', id: TASK, title: 'X', version: 1 }, origin)).toEqual(
      unavailable,
    );
    expect(embedText('drawing', CANVAS, { state: 'missing', id: CANVAS }, origin)).toEqual(unavailable);
    expect(embedText('task', TASK, undefined, origin)).toEqual(unavailable);
  });
});
