import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { coreModule, createDatabase, type Database, migrate, tables } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_COLUMN_IDS } from '../domain/columns.js';
import type { DocumentBlock } from '../domain/document-models.js';
import type { Project } from '../domain/project-models.js';
import type { TaskAck } from '../domain/task-models.js';
import { workspaceModule } from '../infra/module.js';
import { workspaceRepository } from '../infra/repository/index.js';
import { createWorkspaceService } from '../infra/service.js';
import { testFolder } from '../testing/folders.js';
import { testProject } from '../testing/projects.js';

const request = () => ({ requestId: randomUUID() });
const content = (text: string, blockId = 'block-one'): DocumentBlock[] => [
  { id: blockId, type: 'paragraph', content: [{ type: 'text', text, styles: {} }], children: [] },
];

describe('workspace persistence and adversarial cases', () => {
  let directory: string;
  let filename: string;
  let db: Database;
  let service: ReturnType<typeof createWorkspaceService>;
  let project: Project;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'tinyfold-workspace-'));
    filename = join(directory, 'test.sqlite');
    db = createDatabase(filename);
    await migrate(db, [coreModule, workspaceModule]);
    service = createWorkspaceService(db);
    project = await testProject(service);
  });

  afterEach(async () => {
    await db.destroy();
    await rm(directory, { recursive: true, force: true });
  });

  it('creates a document in its project, persists edits and reopens after server restart', async () => {
    const document = await service.createDocument({ ...request(), projectId: project.id });
    expect(document).toEqual({ id: expect.any(String), version: 1, updatedAt: expect.any(String) });
    expect(await service.getDocument({ id: document.id })).toMatchObject({
      title: 'Sem título',
      projectId: project.id,
      content: [],
    });
    const ack = await service.saveDocument({
      ...request(),
      id: document.id,
      expectedVersion: 1,
      title: 'Primeira ideia',
      content: content('Continuar no celular'),
    });
    expect(ack).toEqual({ id: document.id, version: 2, updatedAt: expect.any(String) });
    await db.destroy();
    db = createDatabase(filename);
    await migrate(db, [coreModule, workspaceModule]);
    const saved = await createWorkspaceService(db).getDocument({ id: document.id });
    expect(saved).toMatchObject({ title: 'Primeira ideia', plainText: 'Continuar no celular', version: 2 });
  });

  it('persists, reopens and searches display and inline math, including unfinished LaTeX', async () => {
    const equations: DocumentBlock[] = [
      {
        id: 'equation',
        type: 'mathBlock',
        props: {},
        content: [{ type: 'text', text: String.raw`\frac{a+b}{c}`, styles: {} }],
        children: [],
      },
      {
        id: 'formula',
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Identidade: ', styles: {} },
          { type: 'math', props: {}, content: String.raw`\sin^2(x)+\cos^2(x)=1` },
        ],
      },
    ];
    const document = await service.createDocument({
      ...request(),
      projectId: project.id,
      title: 'Equações do projeto',
      content: equations,
    });
    await db.destroy();
    db = createDatabase(filename);
    await migrate(db, [coreModule, workspaceModule]);
    service = createWorkspaceService(db);
    expect((await service.getDocument({ id: document.id })).content).toEqual(equations);
    expect(
      (await service.search({ query: String.raw`\frac{a+b}{c}`, types: ['document'] })).items.map((item) => item.id),
    ).toEqual([document.id]);
    expect(
      (await service.search({ query: String.raw`\sin^2(x)`, types: ['document'] })).items.map((item) => item.id),
    ).toEqual([document.id]);
    const unfinished: DocumentBlock[] = [
      { id: 'equation', type: 'mathBlock', props: {}, content: String.raw`\frac{a}{` },
    ];
    const ack = await service.saveDocument({
      ...request(),
      id: document.id,
      expectedVersion: document.version,
      title: 'Equações do projeto',
      content: unfinished,
    });
    expect((await service.getDocument({ id: document.id })).content).toEqual(unfinished);
    expect((await service.getDocument({ id: document.id })).version).toBe(ack.version);
    expect(
      (await service.search({ query: String.raw`\frac{a}{`, types: ['document'] })).items.map((item) => item.id),
    ).toEqual([document.id]);
  });

  it('rejects malformed math before writing and preserves the previous valid document', async () => {
    const document = await service.createDocument({
      ...request(),
      projectId: project.id,
      content: [{ id: 'math', type: 'mathBlock', props: {}, content: 'x^2' }],
    });
    expect(() =>
      service.saveDocument({
        ...request(),
        id: document.id,
        expectedVersion: document.version,
        title: 'Inválido',
        content: [{ type: 'paragraph', content: [{ type: 'math', content: { latex: 'x^2' } }] }],
      }),
    ).toThrow();
    expect((await service.getDocument({ id: document.id })).content).toEqual([
      { id: 'math', type: 'mathBlock', props: {}, content: 'x^2' },
    ]);
    expect((await service.getDocument({ id: document.id })).version).toBe(1);
  });

  it('saves and creates documents with task and drawing embeds, and refuses bad ones before writing', async () => {
    const task = await service.createTask({ ...request(), projectId: project.id, title: 'Incorporada' });
    const canvas = await service.createCanvas({ ...request(), projectId: project.id, title: 'Figura' });
    const embeds = [
      { id: 'e1', type: 'taskEmbed', props: { taskId: task.id }, children: [] },
      { id: 'p1', type: 'paragraph', content: [{ type: 'text', text: 'Entre os dois', styles: {} }], children: [] },
      { id: 'e2', type: 'drawingEmbed', props: { canvasId: canvas.id }, children: [] },
    ];
    const created = await service.createDocument({
      ...request(),
      projectId: project.id,
      title: 'Com',
      content: embeds,
    });
    expect((await service.getDocument({ id: created.id })).content).toEqual(embeds);
    const saved = await service.saveDocument({
      ...request(),
      id: created.id,
      expectedVersion: 1,
      title: 'Com',
      content: [...embeds].reverse(),
    });
    const stored = await service.getDocument({ id: created.id });
    expect(stored).toMatchObject({ version: saved.version, plainText: 'Entre os dois' });
    expect(stored.content.map((block) => block.id)).toEqual(['e2', 'p1', 'e1']);
    const save = (content: unknown) =>
      service.saveDocument({ ...request(), id: created.id, expectedVersion: saved.version, title: 'Com', content });
    expect(() => save([{ type: 'taskEmbed', props: { taskId: 'nada' }, children: [] }])).toThrow(
      'As propriedades do item incorporado são inválidas.',
    );
    expect(() =>
      save(Array.from({ length: 201 }, () => ({ type: 'drawingEmbed', props: { canvasId: canvas.id }, children: [] }))),
    ).toThrow('Um documento aceita até 200 itens incorporados.');
    expect((await service.getDocument({ id: created.id })).version).toBe(saved.version);
  });

  it('retries a save once, rejects request reuse and leaves a compact acknowledgment', async () => {
    const document = await service.createDocument({ ...request(), projectId: project.id });
    const input = {
      ...request(),
      id: document.id,
      expectedVersion: 1,
      title: 'Planejamento',
      content: content('Texto importante '.repeat(1000)),
    };
    const ack = await service.saveDocument(input);
    expect(await service.saveDocument(input)).toEqual(ack);
    expect((await service.getDocument({ id: document.id })).version).toBe(2);
    await expect(service.saveDocument({ ...input, title: 'Outro texto' })).rejects.toMatchObject({
      code: 'REQUEST_REUSED',
    });
    const mutation = await tables<{ core_mutations: { request_id: string; response: string } }>(db)
      .selectFrom('core_mutations')
      .select('response')
      .where('request_id', '=', input.requestId)
      .executeTakeFirstOrThrow();
    expect(mutation.response.length).toBeLessThan(200);
  });

  it('reads a trashed document for its owner, as a drawing, and still refuses to save it (decision 1)', async () => {
    const document = await service.createDocument({
      ...request(),
      projectId: project.id,
      content: content('Rascunho na lixeira'),
    });
    const trashed = await service.deleteDocument({ ...request(), id: document.id, expectedVersion: 1 });
    expect(await service.getDocument({ id: document.id })).toMatchObject({
      id: document.id,
      version: trashed.version,
      deletedAt: trashed.updatedAt,
      plainText: 'Rascunho na lixeira',
    });
    await expect(
      service.saveDocument({
        ...request(),
        id: document.id,
        expectedVersion: trashed.version,
        title: 'Cópia',
        content: content('Texto novo'),
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect((await service.getDocument({ id: document.id })).plainText).toBe('Rascunho na lixeira');
  });

  it('lists live documents and drawings whatever query or deleted a client still sends (decision 5)', async () => {
    const live = await service.createDocument({ ...request(), projectId: project.id, title: 'Plano' });
    const other = await service.createDocument({ ...request(), projectId: project.id, title: 'Outro' });
    const trashed = await service.createDocument({ ...request(), projectId: project.id, title: 'Plano antigo' });
    await service.deleteDocument({ ...request(), id: trashed.id, expectedVersion: 1 });
    const drawing = await service.createCanvas({ ...request(), projectId: project.id, title: 'Plano' });
    const old = { query: 'Plano', deleted: true } as Record<string, unknown>;
    expect((await service.listDocuments({ projectId: project.id, ...old })).map((item) => item.id).sort()).toEqual(
      [live.id, other.id].sort(),
    );
    expect((await service.listCanvases({ projectId: project.id, ...old })).map((item) => item.id)).toEqual([
      drawing.id,
    ]);
  });

  it('cuts the summary of a listed document at 280 code points, never inside an emoji (decision 7)', async () => {
    const text = `${'a'.repeat(279)}😀 e mais texto`;
    const document = await service.createDocument({ ...request(), projectId: project.id, content: content(text) });
    const [listed] = await service.listDocuments({ projectId: project.id });
    expect(listed).toMatchObject({ id: document.id, plainText: `${'a'.repeat(279)}😀` });
  });

  it('says a version conflict in one sentence, before or during the UPDATE (decision 7)', async () => {
    const sentence = 'Este item mudou em outro dispositivo. Atualize os dados antes de continuar.';
    const document = await service.createDocument({ ...request(), projectId: project.id, content: content('Texto') });
    const save = { ...request(), id: document.id, expectedVersion: 2, title: 'Outro', content: content('Outro') };
    await expect(service.saveDocument(save)).rejects.toMatchObject({ code: 'VERSION_CONFLICT', message: sentence });
    // The UPDATE's own check, for a write that read the version before another device saved.
    const stored = await service.getDocument({ id: document.id });
    await expect(workspaceRepository(db).saveDocument({ ...stored, version: 3 }, 2)).rejects.toMatchObject({
      code: 'VERSION_CONFLICT',
      message: sentence,
    });
  });

  it('refuses a search cursor it did not give with VALIDATION, as the completed tasks do (decision 3)', async () => {
    const refused = { code: 'VALIDATION', message: 'Cursor inválido. Repita a consulta sem cursor.' };
    await expect(service.search({ cursor: 'o:40' })).rejects.toMatchObject(refused);
    await expect(service.listCompletedTasks({ projectId: project.id, cursor: 'o:40' })).rejects.toMatchObject(refused);
  });

  it('rejects stale document changes from another database connection', async () => {
    const document = await service.createDocument({
      ...request(),
      projectId: project.id,
      content: content('Original'),
    });
    const second = createDatabase(filename);
    try {
      const other = createWorkspaceService(second);
      const snapshot = await other.getDocument({ id: document.id });
      await service.saveDocument({
        ...request(),
        id: document.id,
        expectedVersion: 1,
        title: 'Computador',
        content: content('Versão nova'),
      });
      await expect(
        other.saveDocument({
          ...request(),
          id: document.id,
          expectedVersion: snapshot.version,
          title: 'Celular',
          content: content('Rascunho antigo'),
        }),
      ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
      expect((await other.getDocument({ id: document.id })).plainText).toBe('Versão nova');
    } finally {
      await second.destroy();
    }
  });

  it('serializes competing edits and commits only one expected revision', async () => {
    const document = await service.createDocument({ ...request(), projectId: project.id });
    const results = await Promise.allSettled(
      ['A', 'B'].map((title) =>
        service.saveDocument({ ...request(), id: document.id, expectedVersion: 1, title, content: content(title) }),
      ),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected).toMatchObject({ reason: { code: 'VERSION_CONFLICT' } });
    expect((await service.getDocument({ id: document.id })).version).toBe(2);
  });

  it('searches accented text and treats SQL wildcard characters literally', async () => {
    const document = await service.createDocument({
      ...request(),
      projectId: project.id,
      title: 'Ideias de ação',
      content: content('Referências para o portfólio: 100% pessoal'),
    });
    expect((await service.search({ query: 'REFERENCIAS', types: ['document'] })).items.map((item) => item.id)).toEqual([
      document.id,
    ]);
    expect((await service.search({ query: '100%', types: ['document'] })).items.map((item) => item.id)).toEqual([
      document.id,
    ]);
  });

  it('creates documents and drawings in an active folder of their project, or at the root', async () => {
    const other = await testProject(service, 'Outro');
    const folder = await testFolder(service, project.id, 'MCP');
    const document = await service.createDocument({ ...request(), projectId: project.id, folderId: folder.id });
    const canvas = await service.createCanvas({ ...request(), projectId: project.id, folderId: folder.id });
    const loose = await service.createDocument({ ...request(), projectId: project.id });
    expect((await service.getDocument({ id: document.id })).folderId).toBe(folder.id);
    expect((await service.getCanvas({ id: canvas.id })).folderId).toBe(folder.id);
    expect((await service.getDocument({ id: loose.id })).folderId).toBeNull();
    expect((await service.listDocuments({ projectId: project.id })).map((item) => item.folderId).sort()).toEqual([
      folder.id,
      null,
    ]);
    // A save keeps the folder.
    await service.saveDocument({ ...request(), id: document.id, expectedVersion: 1, title: 'Plano', content: [] });
    expect((await service.getDocument({ id: document.id })).folderId).toBe(folder.id);

    const elsewhere = await testFolder(service, other.id, 'Alheia');
    for (const create of [
      () => service.createDocument({ ...request(), projectId: project.id, folderId: elsewhere.id }),
      () => service.createCanvas({ ...request(), projectId: project.id, folderId: elsewhere.id }),
    ])
      await expect(create()).rejects.toMatchObject({ code: 'VALIDATION', message: 'A pasta não é deste projeto.' });
    const deleted = await testFolder(service, project.id, 'Excluída');
    await service.deleteFolder({ ...request(), id: deleted.id, expectedVersion: 1, withItems: false });
    for (const folderId of [deleted.id, randomUUID()])
      await expect(service.createDocument({ ...request(), projectId: project.id, folderId })).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'A pasta não está disponível.',
      });
  });

  it('assigns and archives projects without losing documents', async () => {
    const site = await service.createProject({ ...request(), name: 'Site pessoal' });
    const document = await service.createDocument({ ...request(), projectId: site.id });
    await service.updateProject({ ...request(), id: site.id, expectedVersion: 1, archived: true });
    expect(await service.listProjects({})).toEqual([{ ...project, overdueTasks: 0 }]);
    expect(await service.listProjects({ includeArchived: true })).toHaveLength(2);
    expect(await service.listDocuments({ projectId: site.id })).toHaveLength(1);
    // Existing writing can continue, while new assignments require an active project.
    await service.saveDocument({
      ...request(),
      id: document.id,
      expectedVersion: 1,
      title: 'Ainda acessível',
      content: [],
    });
    await expect(service.createDocument({ ...request(), projectId: site.id })).rejects.toMatchObject({
      code: 'DOMAIN_RULE',
    });
    await expect(service.createDocument({ ...request(), projectId: randomUUID() })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('creates a source-linked task exactly once and keeps it when text and document are removed', async () => {
    const document = await service.createDocument({
      ...request(),
      projectId: project.id,
      title: 'Meu plano',
      content: content('Publicar meu portfólio'),
    });
    const input = {
      ...request(),
      title: 'Publicar meu portfólio',
      source: { documentId: document.id, blockId: 'block-one', excerpt: 'meu portfólio', expectedVersion: 1 },
    };
    const first = await service.createTask(input);
    expect(await service.createTask(input)).toEqual(first);
    expect((await service.listTasks({})).tasks).toHaveLength(1);
    await service.saveDocument({
      ...request(),
      id: document.id,
      expectedVersion: 1,
      title: 'Meu plano',
      content: content('Outra ideia', 'block-two'),
    });
    const changed = (await service.listTasks({ documentId: document.id })).tasks[0];
    expect(changed?.source).toMatchObject({ available: true, blockAvailable: false, excerpt: 'meu portfólio' });
    const removed = await service.deleteDocument({ ...request(), id: document.id, expectedVersion: 2 });
    expect((await service.listTasks({})).tasks[0]?.source).toMatchObject({
      available: false,
      excerpt: 'meu portfólio',
    });
    expect((await service.getDocument({ id: document.id })).deletedAt).toBe(removed.updatedAt);
    expect((await service.listDocuments({})).map((item) => item.id)).not.toContain(document.id);
    await service.restoreDocument({ ...request(), id: document.id, expectedVersion: removed.version });
    expect((await service.listTasks({})).tasks[0]?.source?.available).toBe(true);
  });

  it('rejects stale or fabricated source references atomically', async () => {
    const document = await service.createDocument({
      ...request(),
      projectId: project.id,
      content: content('Criar uma página'),
    });
    const task = {
      title: 'Publicar',
      source: { documentId: document.id, blockId: 'block-one', excerpt: 'uma página', expectedVersion: 1 },
    };
    await expect(
      service.createTask({ ...request(), ...task, source: { ...task.source, blockId: 'missing' } }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    await expect(
      service.createTask({ ...request(), ...task, source: { ...task.source, excerpt: 'Texto que não existe' } }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    await expect(
      service.createTask({ ...request(), ...task, source: { ...task.source, expectedVersion: 10 } }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    // Migration 007 raised the revision once, also on a new installation.
    expect(await service.listTasks({})).toEqual({ tasks: [], revision: 1 });
  });

  it('stores an id for every block, so a selection in content from elsewhere can become a task', async () => {
    const paragraph = (text: string): DocumentBlock => ({
      type: 'paragraph',
      content: [{ type: 'text', text, styles: {} }],
    });
    // The web's Markdown import splits a quote around a display formula into children without ids.
    const quote: DocumentBlock = {
      id: 'quote',
      type: 'quote',
      content: [{ type: 'text', text: 'Antes', styles: {} }],
      children: [{ type: 'mathBlock', props: {}, content: 'y' }, paragraph('Depois da fórmula')],
    };
    const document = await service.createDocument({ ...request(), projectId: project.id, content: [quote] });
    const stored = await service.getDocument({ id: document.id });
    expect(stored.content[0]?.id).toBe('quote');
    const after = stored.content[0]?.children?.[1];
    expect(after?.id).toEqual(expect.any(String));
    await service.createTask({
      ...request(),
      title: 'Depois',
      source: { documentId: document.id, blockId: after?.id ?? null, excerpt: 'Depois da fórmula', expectedVersion: 1 },
    });
    const [task] = (await service.listTasks({ documentId: document.id })).tasks;
    expect(task?.source?.blockAvailable).toBe(true);
    // A save without ids, from a script or another client, gets them too.
    await service.saveDocument({
      ...request(),
      id: document.id,
      expectedVersion: 1,
      title: 'Importado',
      content: [paragraph('Sem id')],
    });
    expect((await service.getDocument({ id: document.id })).content[0]?.id).toEqual(expect.any(String));
  });

  it('reorders tasks with board concurrency checks and preserves stable order', async () => {
    const a = await service.createTask({ ...request(), title: 'A', projectId: project.id });
    const b = await service.createTask({ ...request(), title: 'B', projectId: project.id });
    const c = await service.createTask({ ...request(), title: 'C', projectId: project.id });
    const move = {
      ...request(),
      id: c.id,
      expectedVersion: c.version,
      expectedRevision: c.revision,
      columnId: INITIAL_COLUMN_IDS.todo,
      beforeTaskId: a.id,
    };
    const moved = await service.moveTask(move);
    expect(await service.moveTask(move)).toEqual(moved);
    const current = await service.listTasks({});
    expect(current.tasks.map((task) => task.title)).toEqual(['C', 'A', 'B']);
    expect(current.revision).toBe(5);
    await expect(
      service.moveTask({
        ...request(),
        id: b.id,
        expectedVersion: b.version,
        expectedRevision: c.revision,
        columnId: INITIAL_COLUMN_IDS.doing,
      }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    expect((await service.listTasks({})).revision).toBe(5);
  });

  it("renumbers only the moved task's project column, without editing the neighbours", async () => {
    const other = await testProject(service, 'Outro');
    const created: Record<string, { id: string; version: number }> = {};
    for (const [title, projectId] of [
      ['a0', project.id],
      ['b0', other.id],
      ['a1', project.id],
      ['b1', other.id],
      ['a2', project.id],
      ['b2', other.id],
    ] as const)
      created[title] = await service.createTask({ ...request(), title, projectId });
    const rows = (projectId: string) =>
      sql`select * from workspace_tasks where project_id = ${projectId} order by id`.execute(db).then((r) => r.rows);
    const otherBefore = await rows(other.id);
    const before = await service.listTasks({ projectId: project.id });
    const moved = created.a2;
    await service.moveTask({
      ...request(),
      id: moved?.id ?? '',
      expectedVersion: moved?.version ?? 0,
      expectedRevision: before.revision,
      columnId: INITIAL_COLUMN_IDS.todo,
      beforeTaskId: created.a0?.id ?? null,
    });
    expect(await rows(other.id)).toEqual(otherBefore);
    const after = await service.listTasks({ projectId: project.id });
    expect(after.tasks.map((task) => [task.title, task.position])).toEqual([
      ['a2', 0],
      ['a0', 1],
      ['a1', 2],
    ]);
    const [was, is] = [before, after].map((list) => new Map(list.tasks.map((task) => [task.title, task])));
    // The neighbours keep version and date. The moved task gets a new version; its new date may fall in
    // the millisecond it was created in, so only the version tells.
    for (const title of ['a0', 'a1'])
      expect(is?.get(title)).toMatchObject({
        version: was?.get(title)?.version,
        updatedAt: was?.get(title)?.updatedAt,
      });
    expect(is?.get('a2')?.version).toBe((was?.get('a2')?.version ?? 0) + 1);
  });

  it('puts a task that changes project at the end of the column there, without repeating a position', async () => {
    const other = await testProject(service, 'Outro');
    const tasks: Record<string, TaskAck> = {};
    for (const [title, projectId] of [
      ['a0', project.id],
      ['b0', other.id],
      ['a1', project.id],
      ['b1', other.id],
    ] as const)
      tasks[title] = await service.createTask({ ...request(), title, projectId });
    // Each project's column numbered from 0 again, as moves within one board leave it.
    for (const [moved, before] of [
      ['a1', 'a0'],
      ['b1', 'b0'],
    ] as const) {
      const { revision } = await service.listTasks({});
      await service.moveTask({
        ...request(),
        id: tasks[moved]?.id ?? '',
        expectedVersion: 1,
        expectedRevision: revision,
        columnId: INITIAL_COLUMN_IDS.todo,
        beforeTaskId: tasks[before]?.id ?? null,
      });
    }
    await service.updateTask({ ...request(), id: tasks.a0?.id ?? '', expectedVersion: 1, projectId: other.id });
    const column = (await service.listTasks({ projectId: other.id })).tasks.map((task) => [task.title, task.position]);
    expect(column.map(([title]) => title)).toEqual(['b1', 'b0', 'a0']);
    expect(new Set(column.map(([, position]) => position)).size).toBe(3);
  });

  it('keeps document text unchanged when the linked task is renamed and completed', async () => {
    const document = await service.createDocument({
      ...request(),
      projectId: project.id,
      content: content('Escrever apresentação'),
    });
    const created = await service.createTask({
      ...request(),
      title: 'Escrever apresentação',
      source: { documentId: document.id, excerpt: 'Escrever apresentação' },
    });
    await service.saveTaskText({
      ...request(),
      id: created.id,
      expectedTextVersion: 1,
      title: 'Publicar apresentação',
      description: [],
    });
    const result = await service.updateTask({
      ...request(),
      id: created.id,
      expectedVersion: 1,
      columnId: INITIAL_COLUMN_IDS.done,
    });
    expect(result.version).toBe(2);
    expect((await service.getTask({ id: created.id })).completedAt).not.toBeNull();
    expect((await service.getDocument({ id: document.id })).plainText).toBe('Escrever apresentação');
    await expect(
      service.updateTask({ ...request(), id: created.id, expectedVersion: 1, dueOn: '2026-12-01' }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
  });

  it('filters tasks by project and persists task deletion', async () => {
    const other = await service.createProject({ ...request(), name: 'Outro' });
    const first = await service.createTask({ ...request(), title: 'Primeira', projectId: project.id });
    await service.createTask({ ...request(), title: 'Organizada', projectId: other.id });
    expect((await service.listTasks({})).tasks).toHaveLength(2);
    expect((await service.listTasks({ projectId: project.id })).tasks.map((task) => task.id)).toEqual([first.id]);
    expect((await service.listTasks({ projectId: other.id })).tasks).toHaveLength(1);
    const deletion = { ...request(), id: first.id, expectedVersion: 1 };
    expect(await service.deleteTask(deletion)).toEqual(await service.deleteTask(deletion));
    expect((await service.listTasks({})).tasks).toHaveLength(1);
  });
});
