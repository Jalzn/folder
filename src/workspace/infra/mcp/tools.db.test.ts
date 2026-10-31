import { describe, expect, it } from 'vitest';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import { missingId, paragraph, request, useAgentTools } from '../../testing/agent-tools.js';
import { shape } from '../../testing/canvas-scenes.js';

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
    await agent.service.deleteTask({ ...request(), id: removed.id, expectedVersion: removed.version });
    await agent.service.updateProject({
      ...request(),
      id: archived.id,
      expectedVersion: archived.version,
      archived: true,
    });
    await agent.service.createDocument({ ...request(), projectId: agent.project.id, title: 'Ativo' });

    const active = expect.objectContaining({
      id: agent.project.id,
      color: 'violet',
      position: 0,
      archived: false,
      documents: 1,
    });
    expect(await agent.json('list_projects')).toEqual({ projects: [active], nextCursor: null });
    const { projects } = await agent.json<{ projects: Record<string, unknown>[] }>('list_projects', {
      includeArchived: true,
    });
    expect(projects).toEqual([
      expect.objectContaining({
        id: archived.id,
        color: 'ochre',
        position: null,
        archived: true,
        documents: 1,
        drawings: 0,
        openTasks: 1,
      }),
      active,
    ]);
    const { items } = await agent.json<{ items: { id: string; projectArchived: boolean }[] }>('search', {
      projectId: archived.id,
    });
    expect(items.map((item) => item.id)).toEqual([open.id, done.id, kept.id]);
    expect(items.every((item) => item.projectArchived)).toBe(true);
    for (const [name, id] of [
      ['read_document', trashed.id],
      ['read_document', missingId],
      ['read_task', removed.id],
    ] as const)
      expect(await agent.call(name, { id })).toMatchObject({
        isError: true,
        text: expect.stringContaining('na lixeira'),
      });
  });

  it('keeps every text result within the output ceiling, by its own budget', async () => {
    // Quotes, backslashes and control characters grow the most when written as JSON.
    const heavy = (length: number) => '"\\\u0001'.repeat(length).slice(0, length);
    const results: { name: string; text: string }[] = [];
    const record = async (name: string, input: Record<string, unknown>) => {
      const result = await agent.call(name, input);
      results.push({ name, text: result.text });
      return result;
    };

    const projects = [];
    for (let index = 0; index < 205; index += 1)
      projects.push(await agent.service.createProject({ ...request(), name: `${heavy(96)}${index}` }));
    let listed = 0;
    for (let cursor: string | null | undefined; cursor !== null; ) {
      const page = JSON.parse((await record('list_projects', cursor ? { cursor } : {})).text) as {
        projects: unknown[];
        nextCursor: string | null;
      };
      listed += page.projects.length;
      cursor = page.nextCursor;
    }
    expect(listed).toBe(206);

    const [heaviest] = projects;
    if (!heaviest) throw new Error('No project to fill.');
    const projectId = heaviest.id;
    const code = { type: 'codeBlock', props: { language: 'ts' }, content: 'linha de código\n'.repeat(3_000) };
    const document = await agent.service.createDocument({
      ...request(),
      title: `${heavy(295)} alvo`,
      projectId,
      content: [paragraph(`alvo ${heavy(3_000)}`), code, paragraph('palavra '.repeat(8_000))],
    });
    // Every third task comes from a document deleted for good, whose sources keep its long title.
    const gone = await agent.service.createDocument({
      ...request(),
      title: heavy(300),
      projectId,
      content: [paragraph(heavy(3_000))],
    });
    for (let index = 0; index < 150; index += 1)
      await agent.service.createTask({
        ...request(),
        title: `${heavy(290)} alvo ${index}`,
        projectId,
        source: { documentId: index % 3 === 2 ? gone.id : document.id, excerpt: heavy(3_000) },
      });
    const trashed = await agent.service.deleteDocument({ ...request(), id: gone.id, expectedVersion: gone.version });
    await agent.service.purgeDocument({ ...request(), id: gone.id, expectedVersion: trashed.version });
    const labels = Array.from({ length: 60 }, (_, index) =>
      shape(`t${index}`, 'text', {
        text: heavy(500),
        originalText: heavy(500),
        link: `https://a.b/${'"\\'.repeat(25)}`,
      }),
    );
    const drawing = await agent.service.createCanvas({
      ...request(),
      title: heavy(300),
      projectId,
      scene: { appState: { viewBackgroundColor: '#ffffff' }, elements: labels },
    });

    await agent.service.pinItem({ type: 'document', id: document.id });
    await agent.service.pinItem({ type: 'drawing', id: drawing.id });

    const first = await record('read_document', { id: document.id });
    expect(first.text).toMatch(/… e mais \d+ tarefas\. Use list_tasks com documentId/u);
    for (let cursor = /"cursor":"(\d+:\d+)"/u.exec(first.text)?.[1]; cursor; ) {
      const next = await record('read_document', { id: document.id, cursor });
      cursor = /"cursor":"(\d+:\d+)"/u.exec(next.text)?.[1];
    }
    await record('search', { query: 'alvo', limit: 50 });
    expect((await record('search', { limit: 50 })).text).toContain('"pinned":true');
    const page = JSON.parse((await record('list_tasks', { limit: 100 })).text) as {
      tasks: { id: string; source: { documentId: string | null } }[];
    };
    expect(page.tasks.some((task) => task.source.documentId === null)).toBe(true);
    for (const task of page.tasks.slice(0, 3)) await record('read_task', { id: task.id });
    expect((await record('read_drawing', { id: drawing.id, image: false })).text).toContain('… omitidos:');
    await record('read_document', { id: document.id, cursor: '1:5' });

    expect(results.length).toBeGreaterThan(10);
    for (const { name, text } of results) {
      expect(text.length, name).toBeLessThanOrEqual(READING_LIMITS.toolTextChars);
      expect(text, name).not.toContain('resposta cortada');
    }
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
