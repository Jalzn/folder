import { describe, expect, it } from 'vitest';
import { paragraph, request, useAgentTools } from '../../testing/agent-tools.js';

describe('list_tasks and read_task', () => {
  const agent = useAgentTools();

  it('lists tasks in board order with filters and a trashed source', async () => {
    const project = await agent.service.createProject({ ...request(), name: 'Quadro' });
    const document = await agent.service.createDocument({
      ...request(),
      title: 'Origem',
      projectId: project.id,
      content: [paragraph('Trecho importante', 'b')],
    });
    const fromText = await agent.service.createTask({
      ...request(),
      title: 'Nasceu do trecho',
      source: { documentId: document.id, blockId: 'b', excerpt: 'Trecho importante' },
    });
    const doing = await agent.service.createTask({
      ...request(),
      title: 'Em curso',
      projectId: project.id,
      status: 'doing',
    });
    const first = await agent.service.createTask({ ...request(), title: 'Primeira', projectId: project.id });
    await agent.service.createTask({ ...request(), title: 'Pronta', projectId: project.id, status: 'done' });
    await agent.service.createTask({ ...request(), title: 'Fora do projeto', projectId: agent.project.id });

    const all = await agent.json<{ tasks: { title: string }[] }>('list_tasks', { projectId: project.id });
    expect(all.tasks.map((task) => task.title)).toEqual(['Nasceu do trecho', 'Primeira', 'Em curso', 'Pronta']);
    const filtered = await agent.json<{ tasks: { id: string }[] }>('list_tasks', {
      status: ['todo', 'doing'],
      query: 'PRIMEIRA',
    });
    expect(filtered.tasks.map((task) => task.id)).toEqual([first.task.id]);
    const paged = await agent.json<{ tasks: { id: string }[]; nextCursor: string }>('list_tasks', {
      projectId: project.id,
      limit: 2,
    });
    const { revision } = await agent.service.listTasks({});
    expect(paged.nextCursor).toBe(`t~${revision}~0~${first.task.position}~${first.task.id}`);
    const next = await agent.json<{ tasks: { id: string }[]; nextCursor: null }>('list_tasks', {
      projectId: project.id,
      cursor: paged.nextCursor,
    });
    expect(next.tasks.map((task) => task.id)[0]).toBe(doing.task.id);
    expect(next.nextCursor).toBeNull();

    const fromDocument = await agent.json<{ tasks: { id: string }[] }>('list_tasks', { documentId: document.id });
    expect(fromDocument.tasks.map((task) => task.id)).toEqual([fromText.task.id]);
    await agent.service.deleteDocument({ ...request(), id: document.id, expectedVersion: document.version });
    const listed = await agent.json<{ tasks: { id: string; source: unknown }[] }>('list_tasks', { query: 'trecho' });
    expect(listed.tasks[0]?.source).toEqual({ documentId: document.id, documentTitle: null, available: false });
    expect(await agent.json('read_task', { id: fromText.task.id })).toMatchObject({
      title: 'Nasceu do trecho',
      status: 'todo',
      statusLabel: 'A fazer',
      projectName: 'Quadro',
      position: 0,
      source: {
        documentId: document.id,
        documentTitle: null,
        blockId: 'b',
        excerpt: 'Trecho importante',
        available: false,
        blockAvailable: false,
      },
    });
  });

  it('keeps the title of a source document deleted for good', async () => {
    const document = await agent.service.createDocument({
      ...request(),
      projectId: agent.project.id,
      title: 'Plano antigo',
      content: [paragraph('Revisar o orçamento', 'b')],
    });
    const { task } = await agent.service.createTask({
      ...request(),
      title: 'Revisar',
      source: { documentId: document.id, blockId: 'b', excerpt: 'Revisar o orçamento' },
    });
    const trashed = await agent.service.deleteDocument({ ...request(), id: document.id, expectedVersion: 1 });
    await agent.service.purgeDocument({ ...request(), id: document.id, expectedVersion: trashed.version });

    const { tasks } = await agent.json<{ tasks: { source: unknown }[] }>('list_tasks');
    expect(tasks[0]?.source).toEqual({ documentId: null, documentTitle: 'Plano antigo', available: false });
    expect(await agent.json('read_task', { id: task.id })).toMatchObject({
      source: {
        documentId: null,
        documentTitle: 'Plano antigo',
        blockId: 'b',
        excerpt: 'Revisar o orçamento',
        available: false,
        blockAvailable: false,
      },
    });
    expect(await agent.json('list_tasks', { documentId: document.id })).toEqual({ tasks: [], nextCursor: null });
  });

  it('refuses a cursor from before the board changed', async () => {
    const created = [];
    for (let index = 0; index < 5; index += 1)
      created.push(
        (await agent.service.createTask({ ...request(), title: `Tarefa ${index}`, projectId: agent.project.id })).task,
      );
    const first = await agent.json<{ tasks: { title: string }[]; nextCursor: string }>('list_tasks', { limit: 2 });
    expect(first.tasks.map((task) => task.title)).toEqual(['Tarefa 0', 'Tarefa 1']);
    const moved = created[4];
    const { revision } = await agent.service.listTasks({});
    await agent.service.moveTask({
      ...request(),
      id: moved?.id ?? '',
      expectedVersion: moved?.version ?? 0,
      expectedRevision: revision,
      status: 'todo',
      beforeTaskId: created[0]?.id ?? null,
    });
    expect(await agent.call('list_tasks', { limit: 2, cursor: first.nextCursor })).toEqual({
      isError: true,
      text: 'O quadro mudou desde a primeira página. Liste de novo sem cursor.',
    });
    const again = await agent.json<{ tasks: { title: string }[] }>('list_tasks', { limit: 2 });
    expect(again.tasks.map((task) => task.title)).toEqual(['Tarefa 4', 'Tarefa 0']);
  });
});
