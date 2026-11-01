import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';
import { INITIAL_COLUMN_IDS } from '../../domain/columns.js';
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
      columnId: INITIAL_COLUMN_IDS.done,
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

  it("lists each project's active folders in the sidebar's order, with their live items counted", async () => {
    const create = (name: string, projectId = agent.project.id) =>
      agent.service.createFolder({ ...request(), projectId, name });
    const [arquitetura, mcp, gone] = [await create('Arquitetura'), await create('MCP'), await create('Excluída')];
    await agent.service.deleteFolder({ ...request(), id: gone.id, expectedVersion: 1, withItems: false });
    await agent.service.createDocument({ ...request(), projectId: agent.project.id, folderId: arquitetura.id });
    await agent.service.createCanvas({ ...request(), projectId: agent.project.id, folderId: arquitetura.id });
    const trashed = await agent.service.createDocument({ ...request(), projectId: agent.project.id, folderId: mcp.id });
    await agent.service.deleteDocument({ ...request(), id: trashed.id, expectedVersion: 1 });
    const archived = await agent.service.createProject({ ...request(), name: 'Antigo' });
    const old = await create('Velha', archived.id);
    await agent.service.updateProject({ ...request(), id: archived.id, expectedVersion: 1, archived: true });

    const { projects } = await agent.json<{ projects: { id: string; folderCount: number; folders: unknown[] }[] }>(
      'list_projects',
      { includeArchived: true },
    );
    expect(projects.map((project) => [project.id, project.folderCount, project.folders])).toEqual([
      [archived.id, 1, [{ id: old.id, name: 'Velha', items: 0 }]],
      [
        agent.project.id,
        2,
        [
          { id: mcp.id, name: 'MCP', items: 0 },
          { id: arquitetura.id, name: 'Arquitetura', items: 2 },
        ],
      ],
    ]);
  });

  // About a second alone, past five on a loaded machine: it writes hundreds of heavy rows.
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
    const [heaviest, ...others] = projects;
    if (!heaviest) throw new Error('No project to fill.');
    const projectId = heaviest.id;
    // Folders with names as heavy as they get: 200 in one project, of which list_projects shows 50, and 50
    // in each of ten others. A client can no longer send the control characters that grow the most in
    // JSON, so the names are written by SQL, as a table edited by hand could hold them.
    const folder = (inProject: string, index: number) =>
      agent.service.createFolder({ ...request(), projectId: inProject, name: `Pasta ${index}` });
    const filedIn = await folder(projectId, 0);
    for (let index = 1; index < 200; index += 1) await folder(projectId, index);
    for (const other of others.slice(0, 10)) for (let index = 0; index < 50; index += 1) await folder(other.id, index);
    await sql`update workspace_folders set name = ${heavy(96)} || substr(name, 7)`.execute(agent.db);
    let listed = 0;
    for (let cursor: string | null | undefined; cursor !== null; ) {
      const page = JSON.parse((await record('list_projects', cursor ? { cursor } : {})).text) as {
        projects: { id: string; folderCount: number; folders: unknown[] }[];
        nextCursor: string | null;
      };
      listed += page.projects.length;
      const shown = page.projects.find((project) => project.id === projectId);
      if (shown) expect([shown.folders.length, shown.folderCount]).toEqual([50, 200]);
      cursor = page.nextCursor;
    }
    expect(listed).toBe(206);
    const code = { type: 'codeBlock', props: { language: 'ts' }, content: 'linha de código\n'.repeat(3_000) };
    const document = await agent.service.createDocument({
      ...request(),
      title: `${heavy(295)} alvo`,
      projectId,
      folderId: filedIn.id,
      content: [paragraph(`alvo ${heavy(3_000)}`), code, paragraph('palavra '.repeat(8_000))],
    });
    // Every third task comes from a document deleted for good, whose sources keep its long title.
    const gone = await agent.service.createDocument({
      ...request(),
      title: heavy(300),
      projectId,
      content: [paragraph(heavy(3_000))],
    });
    // 20 columns and 100 labels, the most there can be, named by SQL as heavy as they get. Each task has
    // 20 of the labels, a due date, a checklist and a description whose only match is `descricaoalvo`.
    for (let index = 3; index < 20; index += 1)
      await agent.service.createColumn({ ...request(), name: `Coluna ${index}` });
    const labelIds = [];
    for (let index = 0; index < 100; index += 1)
      labelIds.push((await agent.service.createLabel({ ...request(), name: `Etiqueta ${index}` })).id);
    await sql`update workspace_columns set name = ${heavy(57)} || position`.execute(agent.db);
    await sql`update workspace_labels set name = ${heavy(27)} || substr(name, 10)`.execute(agent.db);
    const columns = (await agent.service.listColumns({})).columns;
    const check = (checked: boolean) => ({
      type: 'checkListItem',
      props: { checked },
      content: [{ type: 'text', text: heavy(200), styles: {} }],
    });
    for (let index = 0; index < 150; index += 1)
      await agent.service.createTask({
        ...request(),
        title: `${heavy(290)} alvo ${index}`,
        projectId,
        columnId: columns[index % columns.length]?.id,
        dueOn: '2026-10-01',
        labelIds: labelIds.slice(index % 80, (index % 80) + 20),
        description: [check(true), check(false), paragraph(`${heavy(3_000)} descricaoalvo ${heavy(3_000)}`)],
        source: { documentId: index % 3 === 2 ? gone.id : document.id, excerpt: heavy(3_000) },
      });
    const long = await agent.service.createTask({
      ...request(),
      title: heavy(300),
      projectId,
      labelIds: labelIds.slice(0, 20),
      description: Array.from({ length: 100 }, () => paragraph(heavy(2_000))),
      source: { documentId: document.id, excerpt: heavy(3_000) },
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
      folderId: filedIn.id,
      scene: { appState: { viewBackgroundColor: '#ffffff' }, elements: labels },
    });

    await agent.service.pinItem({ type: 'document', id: document.id });
    await agent.service.pinItem({ type: 'drawing', id: drawing.id });

    const first = await record('read_document', { id: document.id });
    expect(first.text).toMatch(/… e mais \d+ tarefas\. Use list_tasks com documentId/u);
    for (let cursor = /"cursor":"([0-9a-f]+:\d+)"/u.exec(first.text)?.[1]; cursor; ) {
      const next = await record('read_document', { id: document.id, cursor });
      cursor = /"cursor":"([0-9a-f]+:\d+)"/u.exec(next.text)?.[1];
    }
    await record('search', { query: 'alvo', limit: 50 });
    expect((await record('search', { folderId: filedIn.id, limit: 50 })).text).toContain('"folder":{');
    expect((await record('search', { limit: 50 })).text).toContain('"pinned":true');
    const page = JSON.parse((await record('list_tasks', { limit: 100 })).text) as {
      tasks: { id: string; source: { documentId: string | null } }[];
    };
    expect(page.tasks.some((task) => task.source.documentId === null)).toBe(true);
    for (const task of page.tasks.slice(0, 3)) await record('read_task', { id: task.id });
    let pages = 1;
    for (
      let cursor = /"cursor":"([0-9a-f]+:\d+)"/u.exec((await record('read_task', { id: long.id })).text)?.[1];
      cursor;
    ) {
      const next = await record('read_task', { id: long.id, cursor });
      cursor = /"cursor":"([0-9a-f]+:\d+)"/u.exec(next.text)?.[1];
      pages += 1;
    }
    expect(pages).toBeGreaterThan(5);
    // A document with 200 embeds, the most there can be, of heavy titles in heavily named columns, half of
    // them in the trash, read to its last page.
    const embeds = [];
    for (let index = 0; index < 100; index += 1) {
      const task = await agent.service.createTask({
        ...request(),
        title: heavy(300),
        projectId,
        columnId: columns[index % columns.length]?.id,
      });
      const drawing = await agent.service.createCanvas({ ...request(), title: heavy(300), projectId });
      if (index % 2) {
        await agent.service.deleteTask({ ...request(), id: task.id, expectedVersion: 1 });
        await agent.service.deleteCanvas({ ...request(), id: drawing.id, expectedVersion: 1 });
      }
      embeds.push({ type: 'taskEmbed', props: { taskId: task.id }, children: [] });
      embeds.push({ type: 'drawingEmbed', props: { canvasId: drawing.id }, children: [] });
    }
    const embedding = await agent.service.createDocument({
      ...request(),
      title: heavy(300),
      projectId,
      content: [...embeds, paragraph('palavra '.repeat(8_000))],
    });
    let embedPages = 0;
    let embedCursor: string | undefined;
    do {
      const next = await record('read_document', { id: embedding.id, ...(embedCursor ? { cursor: embedCursor } : {}) });
      expect(next.isError).toBe(false);
      embedCursor = /"cursor":"([0-9a-f]+:\d+)"/u.exec(next.text)?.[1];
      embedPages += 1;
    } while (embedCursor);
    expect(embedPages).toBeGreaterThan(2);
    const filtered = await record('list_tasks', {
      columns: columns.map((column) => column.name),
      labels: [`${heavy(27)}${40}`, `${heavy(27)}${50}`],
      limit: 100,
    });
    expect((JSON.parse(filtered.text) as { tasks: unknown[] }).tasks.length).toBeGreaterThan(0);
    const described = await record('search', { query: 'descricaoalvo', types: ['task'], limit: 50 });
    expect(described.text).toContain('descricaoalvo');
    expect((await record('read_drawing', { id: drawing.id, image: false })).text).toContain('… omitidos:');
    await record('read_document', { id: document.id, cursor: '1:5' });

    expect(results.length).toBeGreaterThan(10);
    for (const { name, text } of results) {
      expect(text.length, name).toBeLessThanOrEqual(READING_LIMITS.toolTextChars);
      expect(text, name).not.toContain('resposta cortada');
    }
  }, 30_000);

  it('logs unexpected failures and answers with a generic message', async () => {
    await agent.closeDatabase();
    expect(await agent.call('list_projects', {})).toEqual({
      isError: true,
      text: 'Falha interna ao consultar o Tinyfold. Tente de novo.',
    });
    expect(agent.logError).toHaveBeenCalledTimes(1);
  });
});
