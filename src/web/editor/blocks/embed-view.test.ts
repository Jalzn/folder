import { describe, expect, it } from 'vitest';
import type { EmbeddedDrawing, EmbeddedTask } from '../../lib/queries/embeds';
import { drawingEmbedView, taskEmbedView } from './embed-view';

const project = { id: 'p1', name: 'Tinyfold', color: 'violet', archived: false } as const;
const other = { id: 'p2', name: 'Reforma do escritório', color: 'ochre', archived: true } as const;
const context = { documentProjectId: 'p1', today: '2026-11-01', openTaskId: null, readOnly: false };

const liveTask = (patch: Partial<Extract<EmbeddedTask, { state: 'live' }>> = {}): EmbeddedTask => ({
  state: 'live',
  id: 't1',
  title: 'Gerar token pessoal no Perfil',
  version: 3,
  column: { id: 'c2', name: 'Em andamento', isDone: false },
  dueOn: '2026-11-06',
  completedAt: null,
  labels: [],
  checklist: { done: 2, total: 5 },
  project,
  ...patch,
});

const liveDrawing = (patch: Partial<Extract<EmbeddedDrawing, { state: 'live' }>> = {}): EmbeddedDrawing => ({
  state: 'live',
  id: 'd1',
  title: 'Navegação com projeto no centro',
  version: 2,
  project,
  folder: null,
  preview: { fingerprint: 'abc', sceneVersion: 2, width: 800, height: 400, current: true },
  empty: false,
  ...patch,
});

describe('taskEmbedView', () => {
  it('waits for the resolver, then shows the card with the column', () => {
    expect(taskEmbedView(undefined, context)).toEqual({ kind: 'loading' });
    const view = taskEmbedView(liveTask(), context);
    expect(view).toMatchObject({ kind: 'card', status: 'Em andamento', open: false, late: false, otherProject: null });
    expect(view.kind === 'card' && view.label).toBe('Tarefa: Gerar token pessoal no Perfil, Em andamento');
  });

  it('says "aberta abaixo" while the drawer shows the task, "Concluída" in the done column, and the late date', () => {
    const open = taskEmbedView(liveTask(), { ...context, openTaskId: 't1' });
    expect(open.kind === 'card' && open.label).toBe(
      'Tarefa: Gerar token pessoal no Perfil, Em andamento, aberta abaixo',
    );
    const done = taskEmbedView(
      liveTask({ column: { id: 'c3', name: 'Concluído', isDone: true }, dueOn: '2026-10-01' }),
      context,
    );
    expect(done).toMatchObject({ kind: 'card', done: true, status: 'Concluída', late: false });
    expect(taskEmbedView(liveTask({ dueOn: '2026-10-30' }), context)).toMatchObject({ late: true });
  });

  it('names another project, and says when it is archived', () => {
    const view = taskEmbedView(liveTask({ project: other }), context);
    expect(view).toMatchObject({ kind: 'card', otherProject: other });
    expect(view.kind === 'card' && view.label).toBe(
      'Tarefa: Gerar token pessoal no Perfil, Em andamento, em Reforma do escritório (arquivado)',
    );
  });

  it('offers Restaurar and Remover in the trash, only Remover when gone, and neither when the document only reads', () => {
    const trashed: EmbeddedTask = { state: 'trashed', id: 't1', title: 'Esboçar tela', version: 4 };
    expect(taskEmbedView(trashed, context)).toEqual({
      kind: 'unavailable',
      text: 'Na lixeira: Esboçar tela',
      restore: { id: 't1', title: 'Esboçar tela', version: 4 },
      remove: true,
    });
    expect(taskEmbedView({ state: 'missing', id: 't1' }, context)).toEqual({
      kind: 'unavailable',
      text: 'Esta tarefa foi excluída.',
      restore: null,
      remove: true,
    });
    expect(taskEmbedView(trashed, { ...context, readOnly: true })).toMatchObject({ restore: null, remove: false });
  });
});

describe('drawingEmbedView', () => {
  it('numbers the figure and names another project in the caption', () => {
    expect(drawingEmbedView(liveDrawing(), 2, context)).toMatchObject({
      kind: 'figure',
      caption: 'Figura 2 — Navegação com projeto no centro',
      label: 'Figura 2: Navegação com projeto no centro. Versão atual, somente leitura. Abrir no editor',
    });
    expect(drawingEmbedView(liveDrawing({ project: other }), 1, context)).toMatchObject({
      caption: 'Figura 1 — Navegação com projeto no centro · Reforma do escritório',
    });
  });

  it('shows the trash and the deletion as the task does', () => {
    expect(
      drawingEmbedView({ state: 'trashed', id: 'd1', title: 'Fluxo do autosave', version: 2 }, 1, context),
    ).toMatchObject({ kind: 'unavailable', text: 'Na lixeira: Fluxo do autosave', remove: true });
    expect(drawingEmbedView({ state: 'missing', id: 'd1' }, 1, context)).toMatchObject({
      text: 'Este desenho foi excluído.',
      restore: null,
    });
  });
});
