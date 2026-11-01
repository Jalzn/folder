import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { coreModule, createDatabase, type Database, migrate, tables } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_COLUMN_IDS } from '../domain/columns.js';
import type { DocumentBlock, Project } from '../domain/models.js';
import type { WorkspaceTables } from '../infra/db.js';
import { workspaceModule } from '../infra/module.js';
import { createWorkspaceService } from '../infra/service.js';
import { drawingFixture } from '../testing/canvas-scenes.js';
import { testFolder } from '../testing/folders.js';
import { pngImage } from '../testing/png.js';
import { testProject } from '../testing/projects.js';

const request = () => ({ requestId: randomUUID() });
const content = (text: string): DocumentBlock[] => [
  { id: 'b', type: 'paragraph', content: [{ type: 'text', text, styles: {} }] },
];

describe('project trash and permanent delete', () => {
  let directory: string;
  let db: Database;
  let service: ReturnType<typeof createWorkspaceService>;
  let project: Project;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'tinyfold-trash-'));
    db = createDatabase(join(directory, 'test.sqlite'));
    await migrate(db, [coreModule, workspaceModule]);
    let now = new Date('2026-10-31T12:00:00Z');
    service = createWorkspaceService(db, () => {
      now = new Date(now.getTime() + 1000);
      return now;
    });
    project = await testProject(service);
  });
  afterEach(async () => {
    await db.destroy();
    await rm(directory, { recursive: true, force: true });
  });

  const trashDocument = async (title: string, text = 'Texto') => {
    const document = await service.createDocument({
      ...request(),
      projectId: project.id,
      title,
      content: content(text),
    });
    return service.deleteDocument({ ...request(), id: document.id, expectedVersion: document.version });
  };
  const trashCanvas = async (title: string) => {
    const canvas = await service.createCanvas({ ...request(), projectId: project.id, title, scene: drawingFixture() });
    return service.deleteCanvas({ ...request(), id: canvas.id, expectedVersion: canvas.version });
  };
  const trashTask = async (title: string) => {
    const task = await service.createTask({ ...request(), projectId: project.id, title });
    await service.deleteTask({ ...request(), id: task.id, expectedVersion: task.version });
    return { id: task.id, version: task.version + 1 };
  };
  const rowCount = async (table: string) =>
    (await sql<{ count: number }>`select count(*) as count from ${sql.table(table)}`.execute(db)).rows[0]?.count;

  it("lists the project's trash, every type together, the most recently deleted first", async () => {
    const document = await trashDocument('Rascunho');
    const canvas = await trashCanvas('Esboço');
    const task = await trashTask('Tarefa velha');
    const other = await testProject(service, 'Outro');
    const elsewhere = await service.createDocument({ ...request(), projectId: other.id });
    await service.deleteDocument({ ...request(), id: elsewhere.id, expectedVersion: 1 });
    await service.createDocument({ ...request(), projectId: project.id, title: 'Vivo' });

    const { items } = await service.listTrash({ projectId: project.id });
    expect(items).toEqual([
      {
        type: 'task',
        id: task.id,
        title: 'Tarefa velha',
        version: task.version,
        deletedAt: expect.any(String),
        folder: null,
      },
      {
        type: 'drawing',
        id: canvas.id,
        title: 'Esboço',
        version: canvas.version,
        deletedAt: canvas.updatedAt,
        folder: null,
      },
      {
        type: 'document',
        id: document.id,
        title: 'Rascunho',
        version: document.version,
        deletedAt: document.updatedAt,
        folder: null,
      },
    ]);
    // An archived project's trash still answers.
    await service.updateProject({ ...request(), id: project.id, expectedVersion: project.version, archived: true });
    expect((await service.listTrash({ projectId: project.id })).items).toHaveLength(3);
    await expect(service.listTrash({ projectId: randomUUID() })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('restores into the folder while it is active, and to the root, saying so, once it was deleted', async () => {
    const [mcp, gone] = [await testFolder(service, project.id, 'MCP'), await testFolder(service, project.id, 'Antiga')];
    const inMcp = await service.createDocument({ ...request(), projectId: project.id, folderId: mcp.id });
    const inGone = await service.createCanvas({ ...request(), projectId: project.id, folderId: gone.id });
    const trashedDocument = await service.deleteDocument({ ...request(), id: inMcp.id, expectedVersion: 1 });
    const trashedCanvas = await service.deleteCanvas({ ...request(), id: inGone.id, expectedVersion: 1 });
    await service.deleteFolder({ ...request(), id: gone.id, expectedVersion: 1, withItems: false });

    const { items } = await service.listTrash({ projectId: project.id });
    expect(items.map((item) => [item.id, item.folder])).toEqual([
      [inGone.id, { id: gone.id, name: 'Antiga', deleted: true }],
      [inMcp.id, { id: mcp.id, name: 'MCP', deleted: false }],
    ]);
    expect(
      await service.restoreDocument({ ...request(), id: inMcp.id, expectedVersion: trashedDocument.version }),
    ).toMatchObject({ version: 3, folderGone: false });
    expect((await service.getDocument({ id: inMcp.id })).folderId).toBe(mcp.id);
    expect(
      await service.restoreCanvas({ ...request(), id: inGone.id, expectedVersion: trashedCanvas.version }),
    ).toMatchObject({ version: 3, folderGone: true });
    expect((await service.getCanvas({ id: inGone.id })).folderId).toBeNull();
  });

  it('deletes for good and empties items of a deleted folder, keeping the folder row', async () => {
    const gone = await testFolder(service, project.id, 'Antiga');
    const document = await service.createDocument({ ...request(), projectId: project.id, folderId: gone.id });
    const canvas = await service.createCanvas({ ...request(), projectId: project.id, folderId: gone.id });
    const deleted = await service.deleteFolder({ ...request(), id: gone.id, expectedVersion: 1, withItems: true });
    const [first, second] = deleted.trashed;
    await service.purgeDocument({ ...request(), id: document.id, expectedVersion: first?.version ?? 0 });
    expect(
      await service.emptyTrash({
        ...request(),
        projectId: project.id,
        items: [{ type: 'drawing', id: canvas.id, version: second?.version ?? 0 }],
      }),
    ).toEqual({ purged: 1, skipped: 0 });
    expect(await rowCount('workspace_folders')).toBe(1);
  });

  it('restores a task to the end of its column with a new version and board revision', async () => {
    const trashed = await trashTask('De volta');
    const kept = await service.createTask({ ...request(), projectId: project.id, title: 'Ficou' });
    const before = (await service.listTasks()).revision;
    const restoration = { ...request(), id: trashed.id, expectedVersion: trashed.version };
    const restored = await service.restoreTask(restoration);
    expect(restored).toEqual({
      id: trashed.id,
      projectId: project.id,
      version: trashed.version + 1,
      updatedAt: expect.any(String),
      revision: before + 1,
    });
    expect(await service.restoreTask(restoration)).toEqual(restored);
    const { tasks } = await service.listTasks();
    expect(tasks.map((task) => [task.title, task.position])).toEqual([
      ['Ficou', tasks[0]?.position],
      ['De volta', (tasks.find((task) => task.id === kept.id)?.position ?? 0) + 1],
    ]);
    await expect(
      service.restoreTask({ ...request(), id: trashed.id, expectedVersion: restored.version }),
    ).rejects.toMatchObject({ code: 'DOMAIN_RULE' });
    await expect(service.restoreTask({ ...request(), id: randomUUID(), expectedVersion: 1 })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('deletes a document for good, leaving its tasks with the excerpt and the title it had', async () => {
    const document = await service.createDocument({
      ...request(),
      projectId: project.id,
      title: 'Plano',
      content: content('Publicar o portfólio'),
    });
    const task = await service.createTask({
      ...request(),
      title: 'Publicar',
      source: { documentId: document.id, blockId: 'b', excerpt: 'Publicar o portfólio' },
    });
    const renamed = await service.saveDocument({
      ...request(),
      id: document.id,
      expectedVersion: 1,
      title: 'Plano final',
      content: content('Publicar o portfólio'),
    });
    const trashed = await service.deleteDocument({ ...request(), id: document.id, expectedVersion: renamed.version });
    const purge = { ...request(), id: document.id, expectedVersion: trashed.version };
    expect(await service.purgeDocument(purge)).toEqual({ id: document.id });
    expect(await service.purgeDocument(purge)).toEqual({ id: document.id });

    await expect(service.getDocument({ id: document.id })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect((await service.listTasks()).tasks).toEqual([
      expect.objectContaining({
        id: task.id,
        source: {
          documentId: null,
          documentTitle: 'Plano final',
          blockId: 'b',
          excerpt: 'Publicar o portfólio',
          available: false,
          blockAvailable: false,
        },
      }),
    ]);
    const response = await sql<{ response: string }>`
      select response from core_mutations where operation = 'workspace.purgeDocument'`.execute(db);
    expect(response.rows).toEqual([{ response: JSON.stringify({ id: document.id }) }]);
  });

  it('deletes a drawing with its preview, and a task with its source and a new board revision', async () => {
    const canvas = await service.createCanvas({ ...request(), projectId: project.id, scene: drawingFixture() });
    await service.saveCanvasPreview({ id: canvas.id, version: 1, png: pngImage(10, 10) });
    const trashedCanvas = await service.deleteCanvas({ ...request(), id: canvas.id, expectedVersion: 1 });
    await service.purgeCanvas({ ...request(), id: canvas.id, expectedVersion: trashedCanvas.version });
    await expect(service.getCanvas({ id: canvas.id })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(await rowCount('workspace_canvas_previews')).toBe(0);

    const document = await service.createDocument({ ...request(), projectId: project.id, content: content('Trecho') });
    const task = await service.createTask({
      ...request(),
      title: 'Do trecho',
      source: { documentId: document.id, excerpt: 'Trecho' },
    });
    await service.deleteTask({ ...request(), id: task.id, expectedVersion: 1 });
    const before = (await service.listTasks()).revision;
    await service.purgeTask({ ...request(), id: task.id, expectedVersion: 2 });
    expect((await service.listTasks()).revision).toBe(before + 1);
    expect(await rowCount('workspace_task_sources')).toBe(0);
    expect((await service.listTrash({ projectId: project.id })).items).toEqual([]);
  });

  it('refuses to delete for good what is not in the trash, at another version, or missing', async () => {
    const document = await service.createDocument({ ...request(), projectId: project.id });
    const canvas = await service.createCanvas({ ...request(), projectId: project.id });
    const task = await service.createTask({ ...request(), projectId: project.id, title: 'Viva' });
    const outside = {
      code: 'DOMAIN_RULE',
      message: 'Mova o item para a lixeira antes de excluir de vez.',
    };
    await expect(service.purgeDocument({ ...request(), id: document.id, expectedVersion: 1 })).rejects.toMatchObject(
      outside,
    );
    await expect(service.purgeCanvas({ ...request(), id: canvas.id, expectedVersion: 1 })).rejects.toMatchObject(
      outside,
    );
    await expect(service.purgeTask({ ...request(), id: task.id, expectedVersion: 1 })).rejects.toMatchObject(outside);
    const trashed = await trashDocument('Na lixeira');
    await expect(
      service.purgeDocument({ ...request(), id: trashed.id, expectedVersion: trashed.version - 1 }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    await expect(service.purgeTask({ ...request(), id: randomUUID(), expectedVersion: 1 })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect((await service.listTrash({ projectId: project.id })).items.map((item) => item.id)).toEqual([trashed.id]);
  });

  it('empties the trash of the items shown, keeping one restored or changed meanwhile', async () => {
    const document = await trashDocument('Some');
    const canvas = await trashCanvas('Some também');
    const task = await trashTask('Também');
    const restored = await trashDocument('Restaurado em outro aparelho');
    const other = await testProject(service, 'Outro');
    const elsewhere = await service.createCanvas({ ...request(), projectId: other.id });
    const elsewhereTrashed = await service.deleteCanvas({ ...request(), id: elsewhere.id, expectedVersion: 1 });
    const shown = [
      { type: 'document' as const, id: document.id, version: document.version },
      { type: 'drawing' as const, id: canvas.id, version: canvas.version },
      { type: 'task' as const, id: task.id, version: task.version },
      { type: 'document' as const, id: restored.id, version: restored.version },
      { type: 'drawing' as const, id: elsewhere.id, version: elsewhereTrashed.version },
      { type: 'task' as const, id: randomUUID(), version: 1 },
    ];
    await service.restoreDocument({ ...request(), id: restored.id, expectedVersion: restored.version });
    const emptying = { ...request(), projectId: project.id, items: shown };
    expect(await service.emptyTrash(emptying)).toEqual({ purged: 3, skipped: 3 });
    expect(await service.emptyTrash(emptying)).toEqual({ purged: 3, skipped: 3 });
    expect((await service.listTrash({ projectId: project.id })).items).toEqual([]);
    expect((await service.getDocument({ id: restored.id })).deletedAt).toBeNull();
    expect((await service.listTrash({ projectId: other.id })).items.map((item) => item.id)).toEqual([elsewhere.id]);
  });

  it('leaves no trace of the items deleted for good in any table, the request record included', async () => {
    // Lowercase, so the normalized search columns would hold the same strings.
    const mark = (name: string) => `${name}-${randomUUID()}`;
    const documentTitle = mark('titulo-doc');
    const renamed = mark('doc-renomeado');
    const excerpt = mark('trecho');
    const text = mark('texto-doc');
    const taskTitle = mark('titulo-tarefa');
    const retitled = mark('tarefa-renomeada');
    const canvasTitle = mark('titulo-desenho');
    const label = mark('rotulo-desenho');
    const document = await service.createDocument({
      ...request(),
      projectId: project.id,
      title: documentTitle,
      content: content(`${excerpt} ${text}`),
    });
    const saved = await service.saveDocument({
      ...request(),
      id: document.id,
      expectedVersion: 1,
      title: renamed,
      content: content(`${excerpt} ${text} ${text}`),
    });
    const task = await service.createTask({
      ...request(),
      title: taskTitle,
      source: { documentId: document.id, excerpt },
    });
    const updated = await service.updateTask({ ...request(), id: task.id, expectedVersion: 1, title: retitled });
    const moved = await service.moveTask({
      ...request(),
      id: task.id,
      expectedVersion: updated.version,
      expectedRevision: updated.revision,
      status: 'doing',
    });
    const trashedTask = await service.deleteTask({ ...request(), id: task.id, expectedVersion: moved.version });
    const restoredTask = await service.restoreTask({ ...request(), id: task.id, expectedVersion: moved.version + 1 });
    await service.deleteTask({ ...request(), id: trashedTask.id, expectedVersion: restoredTask.version });
    await service.purgeTask({ ...request(), id: task.id, expectedVersion: restoredTask.version + 1 });
    const trashedDocument = await service.deleteDocument({
      ...request(),
      id: document.id,
      expectedVersion: saved.version,
    });
    await service.purgeDocument({ ...request(), id: document.id, expectedVersion: trashedDocument.version });
    const scene = drawingFixture();
    for (const element of scene.elements)
      if (element.type === 'text') Object.assign(element, { text: label, originalText: label });
    const canvas = await service.createCanvas({ ...request(), projectId: project.id, title: canvasTitle, scene });
    const trashedCanvas = await service.deleteCanvas({ ...request(), id: canvas.id, expectedVersion: 1 });
    await service.purgeCanvas({ ...request(), id: canvas.id, expectedVersion: trashedCanvas.version });

    expect(await rowCount('core_mutations')).toBeGreaterThan(10);
    const tableNames = await sql<{ name: string }>`select name from sqlite_master where type = 'table'`.execute(db);
    const traces: string[] = [];
    for (const { name } of tableNames.rows) {
      const columns = await sql<{ name: string }>`select name from pragma_table_info(${name})`.execute(db);
      for (const column of columns.rows)
        for (const needle of [documentTitle, renamed, excerpt, text, taskTitle, retitled, canvasTitle, label]) {
          const found = await sql<{ count: number }>`select count(*) as count from ${sql.table(name)}
            where instr(cast(${sql.ref(column.name)} as text), ${needle}) > 0`.execute(db);
          if (found.rows[0]?.count) traces.push(`${name}.${column.name}: ${needle}`);
        }
    }
    expect(traces).toEqual([]);
  });

  it('lists and empties up to 1,000 items at once, and counts them all', async () => {
    const deletedAt = (index: number) => new Date(Date.UTC(2026, 9, 1) + index * 1000).toISOString();
    await tables<WorkspaceTables>(db)
      .insertInto('workspace_tasks')
      .values(
        Array.from({ length: 1_001 }, (_, index) => ({
          id: randomUUID(),
          project_id: project.id,
          column_id: INITIAL_COLUMN_IDS.todo,
          title: `Tarefa ${index}`,
          due_on: null,
          completed_at: null,
          description: '[]',
          description_plain_text: '',
          search_text: `tarefa ${index}\n`,
          checklist_done: 0,
          checklist_total: 0,
          position: index,
          version: 2,
          text_version: 1,
          created_at: deletedAt(0),
          updated_at: deletedAt(index),
          deleted_at: deletedAt(index),
        })),
      )
      .execute();
    const trashCount = async () => (await service.projectNavigation({ projectId: project.id })).trashCount;
    const { items } = await service.listTrash({ projectId: project.id });
    expect([items.length, await trashCount()]).toEqual([1_000, 1_001]);
    const shown = items.map(({ type, id, version }) => ({ type, id, version }));
    expect(() =>
      service.emptyTrash({ ...request(), projectId: project.id, items: [...shown, ...shown.slice(0, 1)] }),
    ).toThrow();
    expect(await service.emptyTrash({ ...request(), projectId: project.id, items: shown })).toEqual({
      purged: 1_000,
      skipped: 0,
    });
    // The oldest deletion was not shown, so it stays.
    expect((await service.listTrash({ projectId: project.id })).items.map((item) => item.title)).toEqual(['Tarefa 0']);
    expect(await trashCount()).toBe(1);
  });
});
