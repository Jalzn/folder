import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { coreModule, createDatabase, migrate } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';
import { INITIAL_COLUMN_IDS } from '../../domain/columns.js';
import type { DocumentBlock } from '../../domain/document-models.js';
import { documentToMarkdown } from '../../domain/markdown.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import { paragraph, request, useAgentTools } from '../../testing/agent-tools.js';
import { loadStage09Fixture } from '../../testing/legacy-workspace.js';
import { workspaceModule } from '../module.js';
import { createWorkspaceTools } from './index.js';

const check = (text: string, checked: boolean): DocumentBlock => ({
  type: 'checkListItem',
  props: { checked },
  content: [{ type: 'text', text, styles: {} }],
});

interface ListedTask {
  id: string;
  title: string;
  column: { id: string; name: string; isDone: boolean };
  dueOn: string | null;
  overdue: boolean;
  labels: { id: string; name: string; color: string }[];
  checklist: { done: number; total: number } | null;
  completedAt: string | null;
  source: unknown;
}

interface TaskPage {
  columns: { id: string; name: string; isDone: boolean }[];
  tasks: ListedTask[];
  nextCursor: string | null;
}

describe('list_tasks and read_task', () => {
  const agent = useAgentTools();

  /** The ID and text version a new task's text is saved at. */
  const textOf = async (id: string) => {
    const task = await agent.service.getTask({ id });
    return { id, expectedTextVersion: task.textVersion, title: task.title };
  };

  it('lists tasks in board order with column, due date, labels, checklist and completion', async () => {
    const project = await agent.service.createProject({ ...request(), name: 'Quadro' });
    const document = await agent.service.createDocument({
      ...request(),
      title: 'Origem',
      projectId: project.id,
      content: [paragraph('Trecho importante', 'b')],
    });
    const review = await agent.service.createColumn({ ...request(), name: 'Revisão' });
    const mcp = await agent.service.createLabel({ ...request(), name: 'mcp' });
    const backend = await agent.service.createLabel({ ...request(), name: 'backend' });
    const fromText = await agent.service.createTask({
      ...request(),
      title: 'Nasceu do trecho',
      source: { documentId: document.id, blockId: 'b', excerpt: 'Trecho importante' },
    });
    const doing = await agent.service.createTask({
      ...request(),
      title: 'Em curso',
      projectId: project.id,
      columnId: INITIAL_COLUMN_IDS.doing,
      labelIds: [mcp.id],
    });
    const first = await agent.service.createTask({
      ...request(),
      title: 'Primeira',
      projectId: project.id,
      dueOn: '2026-10-30',
      labelIds: [mcp.id, backend.id],
    });
    await agent.service.saveTaskText({
      ...request(),
      ...(await textOf(first.id)),
      description: [check('Um', true), check('Dois', false), paragraph('Notas')],
    });
    const inReview = await agent.service.createTask({
      ...request(),
      title: 'Em revisão',
      projectId: project.id,
      columnId: review.id,
      dueOn: '2026-10-31',
    });
    const done = await agent.service.createTask({
      ...request(),
      title: 'Pronta',
      projectId: project.id,
      columnId: INITIAL_COLUMN_IDS.done,
      dueOn: '2026-10-01',
    });
    await agent.service.createTask({ ...request(), title: 'Fora do projeto', projectId: agent.project.id });

    const all = await agent.json<TaskPage>('list_tasks', { projectId: project.id });
    expect(all.columns.map((column) => [column.name, column.isDone])).toEqual([
      ['A fazer', false],
      ['Em andamento', false],
      ['Revisão', false],
      ['Concluído', true],
    ]);
    expect(all.tasks.map((task) => task.title)).toEqual([
      'Nasceu do trecho',
      'Primeira',
      'Em curso',
      'Em revisão',
      'Pronta',
    ]);
    const byId = new Map(all.tasks.map((task) => [task.id, task]));
    expect(byId.get(first.id)).toMatchObject({
      column: { id: INITIAL_COLUMN_IDS.todo, name: 'A fazer', isDone: false },
      dueOn: '2026-10-30',
      overdue: true,
      labels: [
        { id: backend.id, name: 'backend', color: 'slate' },
        { id: mcp.id, name: 'mcp', color: 'blue' },
      ],
      checklist: { done: 1, total: 2 },
      completedAt: null,
      source: null,
    });
    // Due today is not late, nor is anything in the done column.
    expect(byId.get(inReview.id)).toMatchObject({ dueOn: '2026-10-31', overdue: false, labels: [], checklist: null });
    expect(byId.get(done.id)).toMatchObject({
      column: { name: 'Concluído', isDone: true },
      overdue: false,
      completedAt: expect.stringMatching(/^2026-10-31T12:/u),
    });
    expect(Object.keys(byId.get(first.id) ?? {})).not.toContain('status');

    const titles = async (input: Record<string, unknown>) =>
      (await agent.json<TaskPage>('list_tasks', input)).tasks.map((task) => task.title);
    expect(await titles({ columns: ['a FAZER', 'Em andamento'], query: 'PRIMEIRA' })).toEqual(['Primeira']);
    expect(await titles({ columns: ['revisao'] })).toEqual(['Em revisão']);
    expect(await titles({ labels: ['MCP'] })).toEqual(['Primeira', 'Em curso']);
    expect(await titles({ labels: ['mcp', 'Backend'] })).toEqual(['Primeira']);
    expect(await titles({ columns: ['Concluído'], labels: ['mcp'] })).toEqual([]);

    const paged = await agent.json<TaskPage>('list_tasks', { projectId: project.id, limit: 2 });
    const { revision, tasks } = await agent.service.listTasks({});
    const position = tasks.find((task) => task.id === first.id)?.position;
    expect(paged.nextCursor).toBe(`t~${revision}~0~${position}~${first.id}`);
    const next = await agent.json<TaskPage>('list_tasks', { projectId: project.id, cursor: paged.nextCursor });
    expect(next.tasks.map((task) => task.id)).toEqual([doing.id, inReview.id, done.id]);
    expect(next.nextCursor).toBeNull();

    const fromDocument = await agent.json<TaskPage>('list_tasks', { documentId: document.id });
    expect(fromDocument.tasks.map((task) => task.id)).toEqual([fromText.id]);
    await agent.service.deleteDocument({ ...request(), id: document.id, expectedVersion: document.version });
    const listed = await agent.json<TaskPage>('list_tasks', { query: 'trecho' });
    expect(listed.tasks[0]?.source).toEqual({ documentId: document.id, documentTitle: null, available: false });
    const read = await agent.call('read_task', { id: fromText.id });
    expect(read.text.split('\n')).toEqual([
      '# Nasceu do trecho',
      '',
      '- Projeto: Quadro',
      '- Coluna: A fazer',
      '- Prazo: nenhum',
      '- Etiquetas: nenhuma',
      `- Origem: documento na lixeira (id ${document.id}), bloco b`,
      '  - Trecho (não está mais no documento): "Trecho importante"',
      expect.stringMatching(/^- Atualizada: 2026-10-31T12:\d\d:\d\d\.000Z · versão 1$/u),
      `- ID: ${fromText.id}`,
      '- Descrição: vazia',
      '',
      '---',
    ]);
  });

  it('refuses an unknown column or label name, listing the ones there are', async () => {
    await agent.service.createColumn({ ...request(), name: 'Revisão' });
    expect(await agent.call('list_tasks', { columns: ['A fazer', ' Pronto '] })).toEqual({
      isError: true,
      text: 'Coluna não encontrada: Pronto. Colunas: A fazer, Em andamento, Revisão, Concluído.',
    });
    expect(await agent.call('list_tasks', { labels: ['mcp'] })).toEqual({
      isError: true,
      text: 'Etiqueta não encontrada: mcp. Etiquetas: nenhuma.',
    });
    const label = await agent.service.createLabel({ ...request(), name: 'backend' });
    await agent.service.createLabel({ ...request(), name: 'kanban' });
    await agent.service.deleteLabel({ ...request(), id: label.id, expectedVersion: 1 });
    expect(await agent.call('list_tasks', { labels: ['backend'] })).toEqual({
      isError: true,
      text: 'Etiqueta não encontrada: backend. Etiquetas: kanban.',
    });
  });

  it('hides deleted labels from the listing and the reading', async () => {
    const mcp = await agent.service.createLabel({ ...request(), name: 'mcp' });
    const kanban = await agent.service.createLabel({ ...request(), name: 'kanban' });
    const task = await agent.service.createTask({
      ...request(),
      title: 'Etiquetada',
      projectId: agent.project.id,
      labelIds: [mcp.id, kanban.id],
    });
    await agent.service.deleteLabel({ ...request(), id: mcp.id, expectedVersion: 1 });
    const { tasks } = await agent.json<TaskPage>('list_tasks');
    expect(tasks[0]?.labels.map((label) => label.name)).toEqual(['kanban']);
    expect((await agent.call('read_task', { id: task.id })).text).toContain('\n- Etiquetas: kanban\n');
  });

  it('reads the due date in the owner time zone', async () => {
    const task = await agent.service.createTask({
      ...request(),
      title: 'Vence hoje em UTC',
      projectId: agent.project.id,
      dueOn: '2026-10-31',
    });
    // 01:00 UTC on Nov 1st is still Oct 31st in São Paulo.
    agent.setNow('2026-11-01T01:00:00Z');
    expect((await agent.json<TaskPage>('list_tasks')).tasks[0]?.overdue).toBe(true);
    agent.setTimeZone('America/Sao_Paulo');
    expect((await agent.json<TaskPage>('list_tasks')).tasks[0]?.overdue).toBe(false);
    expect((await agent.call('read_task', { id: task.id })).text).toContain(
      '\n- Prazo: 2026-10-31 (hoje é 2026-10-31)\n',
    );
    agent.setNow('2026-11-01T03:00:00Z');
    expect((await agent.call('read_task', { id: task.id })).text).toContain(
      '\n- Prazo: atrasada desde 2026-10-31 (hoje é 2026-11-01)\n',
    );
  });

  it('keeps the title of a source document deleted for good', async () => {
    const document = await agent.service.createDocument({
      ...request(),
      projectId: agent.project.id,
      title: 'Plano antigo',
      content: [paragraph('Revisar o orçamento', 'b')],
    });
    const task = await agent.service.createTask({
      ...request(),
      title: 'Revisar',
      source: { documentId: document.id, blockId: 'b', excerpt: 'Revisar o orçamento' },
    });
    const trashed = await agent.service.deleteDocument({ ...request(), id: document.id, expectedVersion: 1 });
    await agent.service.purgeDocument({ ...request(), id: document.id, expectedVersion: trashed.version });

    const { tasks } = await agent.json<TaskPage>('list_tasks');
    expect(tasks[0]?.source).toEqual({ documentId: null, documentTitle: 'Plano antigo', available: false });
    const { text } = await agent.call('read_task', { id: task.id });
    expect(text).toContain(
      '\n- Origem: documento excluído de vez, que se chamava "Plano antigo", bloco b\n' +
        '  - Trecho (não está mais no documento): "Revisar o orçamento"\n',
    );
    expect(await agent.json('list_tasks', { documentId: document.id })).toMatchObject({ tasks: [], nextCursor: null });
  });

  it('reads a long description in pages pinned to its text, with the header cut to its budget', async () => {
    const labels = [];
    for (let index = 0; index < 20; index += 1)
      labels.push(await agent.service.createLabel({ ...request(), name: `${index} ${'"\\'.repeat(13)}` }));
    const document = await agent.service.createDocument({
      ...request(),
      projectId: agent.project.id,
      title: 'Origem pesada',
      content: [paragraph('"\\\u{1}'.repeat(1300), 'b')],
    });
    const task = await agent.service.createTask({
      ...request(),
      title: 'Longa',
      labelIds: labels.map((label) => label.id),
      // JSON escapes make the 3,900 characters of the excerpt 13,000 in the header.
      source: { documentId: document.id, blockId: 'b', excerpt: '"\\\u{1}'.repeat(1300) },
    });
    const description = Array.from({ length: 60 }, (_, index) => paragraph(`${index} ${'palavra '.repeat(400)}`));
    await agent.service.saveTaskText({ ...request(), ...(await textOf(task.id)), description });

    const pages: string[] = [];
    let cursor: string | undefined;
    let first = '';
    do {
      const { isError, text } = await agent.call('read_task', { id: task.id, ...(cursor ? { cursor } : {}) });
      expect(isError).toBe(false);
      expect(text.length).toBeLessThanOrEqual(READING_LIMITS.toolTextChars);
      if (!first) first = text;
      const footer = /\n\n---\nPágina (\d+) de (\d+)\.(?: Continue com read_task (\{.*\})\.)?$/u.exec(text);
      if (!footer) throw new Error('A page without its footer.');
      const body = text.slice(0, footer.index);
      pages.push(pages.length ? body : body.slice(body.indexOf('\n\n---\n\n') + '\n\n---\n\n'.length));
      cursor = footer[3] ? (JSON.parse(footer[3]) as { cursor: string }).cursor : undefined;
    } while (cursor);
    expect(pages.length).toBeGreaterThan(2);
    // Pages end at paragraph breaks, which the result trims.
    expect(pages.join('\n\n')).toBe(documentToMarkdown(description).replace(/\n+$/u, ''));

    const header = first.slice(0, first.indexOf('\n\n---\n\n'));
    expect(header.length).toBeLessThanOrEqual(READING_LIMITS.task.headerChars);
    expect(header).toMatch(/\n- Etiquetas: 0 .*\n/u);
    expect(header).toMatch(/\n {2}- Trecho: "(\\"|\\\\|\\u0001)+…"\n/u);
    expect(header).not.toContain('\n- Checklist');

    const second = /Continue com read_task (\{.*\})\.$/u.exec(first)?.[1] ?? '';
    await agent.service.saveTaskText({ ...request(), ...(await textOf(task.id)), description: [paragraph('Outra')] });
    expect(await agent.call('read_task', JSON.parse(second) as Record<string, unknown>)).toEqual({
      isError: true,
      text: 'A descrição mudou desde a primeira página. Leia de novo sem cursor.',
    });
    expect((await agent.call('read_task', { id: task.id, cursor: 'x' })).isError).toBe(true);
  });

  it('refuses a cursor from before the board changed, a column move included', async () => {
    const created = [];
    for (let index = 0; index < 5; index += 1)
      created.push(
        await agent.service.createTask({ ...request(), title: `Tarefa ${index}`, projectId: agent.project.id }),
      );
    const first = await agent.json<TaskPage>('list_tasks', { limit: 2 });
    expect(first.tasks.map((task) => task.title)).toEqual(['Tarefa 0', 'Tarefa 1']);
    const moved = created[4];
    await agent.service.moveTask({
      ...request(),
      id: moved?.id ?? '',
      expectedVersion: moved?.version ?? 0,
      columnId: INITIAL_COLUMN_IDS.todo,
      beforeTaskId: created[0]?.id ?? null,
    });
    const refused = {
      isError: true,
      text: 'O quadro mudou desde a primeira página. Liste de novo sem cursor.',
    };
    expect(await agent.call('list_tasks', { limit: 2, cursor: first.nextCursor })).toEqual(refused);
    const again = await agent.json<TaskPage>('list_tasks', { limit: 2 });
    expect(again.tasks.map((task) => task.title)).toEqual(['Tarefa 4', 'Tarefa 0']);

    await agent.service.moveColumn({
      ...request(),
      id: INITIAL_COLUMN_IDS.doing,
      beforeColumnId: INITIAL_COLUMN_IDS.todo,
    });
    expect(await agent.call('list_tasks', { limit: 2, cursor: again.nextCursor })).toEqual(refused);
  });

  it('refuses a cursor from before the migration to the board', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'tinyfold-tools-007-'));
    const db = createDatabase(join(directory, 'test.sqlite'));
    try {
      await loadStage09Fixture(db, 'sample');
      const { rows } = await sql<{ revision: number; id: string; position: number }>`
        select (select board_revision from workspace_state) as revision, id, position
        from workspace_tasks where status = 'todo' and deleted_at is null order by position limit 1`.execute(db);
      const [row] = rows;
      if (!row) throw new Error('The sample database changed.');
      await migrate(db, [coreModule, workspaceModule]);
      const [listTasks] = createWorkspaceTools(db, { logError: () => {} }).filter((tool) => tool.name === 'list_tasks');
      if (!listTasks) throw new Error('No list_tasks.');
      const cursor = `t~${row.revision}~0~${row.position}~${row.id}`;
      const result = await listTasks.handler(listTasks.inputSchema.parse({ cursor }));
      expect(result).toMatchObject({
        isError: true,
        content: [{ type: 'text', text: 'O quadro mudou desde a primeira página. Liste de novo sem cursor.' }],
      });
      const fresh = await listTasks.handler(listTasks.inputSchema.parse({ limit: 1 }));
      const [content] = fresh.content;
      const page = JSON.parse(content?.type === 'text' ? content.text : '') as TaskPage;
      expect(page.tasks[0]?.column).toEqual({ id: INITIAL_COLUMN_IDS.todo, name: 'A fazer', isDone: false });
    } finally {
      await db.destroy();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
