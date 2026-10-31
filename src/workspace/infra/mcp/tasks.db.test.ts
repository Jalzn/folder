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
    await agent.service.createTask({ ...request(), title: 'Fora do projeto' });

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
    expect(paged.nextCursor).toBe(`t~0~${first.task.position}~${first.task.id}`);
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
});
