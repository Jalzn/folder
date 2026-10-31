import { describe, expect, it } from 'vitest';
import { missingId, paragraph, request, useAgentTools } from '../../testing/agent-tools.js';

describe('agent read tools', () => {
  const agent = useAgentTools();

  it('leaves trashed items out and flags archived projects', async () => {
    const archived = await agent.service.createProject({ ...request(), name: 'Antigo' });
    const kept = await agent.service.createDocument({ ...request(), title: 'Mantido', projectId: archived.id });
    const trashed = await agent.service.createDocument({ ...request(), title: 'Na lixeira', projectId: archived.id });
    const done = await agent.service.createTask({
      ...request(),
      title: 'Concluída',
      projectId: archived.id,
      status: 'done',
    });
    const open = await agent.service.createTask({ ...request(), title: 'Aberta', projectId: archived.id });
    const removed = await agent.service.createTask({ ...request(), title: 'Removida', projectId: archived.id });
    await agent.service.deleteDocument({ ...request(), id: trashed.id, expectedVersion: trashed.version });
    await agent.service.deleteTask({ ...request(), id: removed.task.id, expectedVersion: removed.task.version });
    await agent.service.updateProject({
      ...request(),
      id: archived.id,
      expectedVersion: archived.version,
      archived: true,
    });
    await agent.service.createDocument({ ...request(), title: 'Solto' });

    expect(await agent.json('list_projects')).toEqual({
      projects: [],
      withoutProject: { documents: 1, drawings: 0, openTasks: 0 },
      nextCursor: null,
    });
    const { projects } = await agent.json<{ projects: Record<string, unknown>[] }>('list_projects', {
      includeArchived: true,
    });
    expect(projects).toEqual([
      expect.objectContaining({ id: archived.id, archived: true, documents: 1, drawings: 0, openTasks: 1 }),
    ]);
    const { items } = await agent.json<{ items: { id: string; projectArchived: boolean }[] }>('search', {
      projectId: archived.id,
    });
    expect(items.map((item) => item.id)).toEqual([open.task.id, done.task.id, kept.id]);
    expect(items.every((item) => item.projectArchived)).toBe(true);
    for (const [name, id] of [
      ['read_document', trashed.id],
      ['read_document', missingId],
      ['read_task', removed.task.id],
    ] as const)
      expect(await agent.call(name, { id })).toMatchObject({
        isError: true,
        text: expect.stringContaining('na lixeira'),
      });
  });

  it('keeps list_projects and the first document page within the output budget', async () => {
    const heavy = '"\\\u0001'.repeat(33);
    for (let index = 0; index < 205; index += 1)
      await agent.service.createProject({ ...request(), name: `${heavy.slice(0, 96)}${index}` });
    const first = await agent.call('list_projects', {});
    const page = JSON.parse(first.text) as { projects: unknown[]; nextCursor: string };
    expect(first.text.length).toBeLessThanOrEqual(70_000);
    expect(page.nextCursor).toMatch(/^p~/u);
    const rest = JSON.parse((await agent.call('list_projects', { cursor: page.nextCursor })).text) as {
      projects: unknown[];
    };
    expect(page.projects.length + rest.projects.length).toBe(205);

    const blocks = Array.from({ length: 30 }, (_, index) => paragraph(`${index} ${'palavra '.repeat(400)}`));
    const document = await agent.service.createDocument({
      ...request(),
      title: heavy.repeat(2).slice(0, 300),
      content: blocks,
    });
    for (let index = 0; index < 51; index += 1)
      await agent.service.createTask({
        ...request(),
        title: heavy.repeat(3).slice(0, 300),
        source: { documentId: document.id, excerpt: `${index % 30} palavra` },
      });
    const read = await agent.call('read_document', { id: document.id });
    expect(read.text.length).toBeLessThanOrEqual(70_000);
    expect(read.text).toMatch(/… e mais \d+ tarefas\. Use list_tasks com documentId/u);
  });

  it('logs unexpected failures and answers with a generic message', async () => {
    await agent.closeDatabase();
    expect(await agent.call('list_projects', {})).toEqual({
      isError: true,
      text: 'Falha interna ao consultar o Tinyfold. Tente de novo.',
    });
    expect(agent.logError).toHaveBeenCalledTimes(1);
  });
});
