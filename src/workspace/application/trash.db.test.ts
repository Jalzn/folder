import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { coreModule, createDatabase, type Database, migrate } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DocumentBlock, Project } from '../domain/models.js';
import { workspaceModule } from '../infra/module.js';
import { createWorkspaceService } from '../infra/service.js';
import { drawingFixture } from '../testing/canvas-scenes.js';
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
    const { task } = await service.createTask({ ...request(), projectId: project.id, title });
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
      { type: 'task', id: task.id, title: 'Tarefa velha', version: task.version, deletedAt: expect.any(String) },
      { type: 'drawing', id: canvas.id, title: 'Esboço', version: canvas.version, deletedAt: canvas.updatedAt },
      {
        type: 'document',
        id: document.id,
        title: 'Rascunho',
        version: document.version,
        deletedAt: document.updatedAt,
      },
    ]);
    // An archived project's trash still answers.
    await service.updateProject({ ...request(), id: project.id, expectedVersion: project.version, archived: true });
    expect((await service.listTrash({ projectId: project.id })).items).toHaveLength(3);
    await expect(service.listTrash({ projectId: randomUUID() })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('restores a task to the end of its column with a new version and board revision', async () => {
    const trashed = await trashTask('De volta');
    const { task: kept } = await service.createTask({ ...request(), projectId: project.id, title: 'Ficou' });
    const before = (await service.listTasks()).revision;
    const restoration = { ...request(), id: trashed.id, expectedVersion: trashed.version };
    const restored = await service.restoreTask(restoration);
    expect(restored).toEqual({
      task: expect.objectContaining({ id: trashed.id, version: trashed.version + 1, position: kept.position + 1 }),
      revision: before + 1,
    });
    expect(await service.restoreTask(restoration)).toEqual(restored);
    expect((await service.listTasks()).tasks.map((task) => task.title)).toEqual(['Ficou', 'De volta']);
    await expect(
      service.restoreTask({ ...request(), id: trashed.id, expectedVersion: restored.task.version }),
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
    const { task } = await service.createTask({
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
    const { task } = await service.createTask({
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
    const { task } = await service.createTask({ ...request(), projectId: project.id, title: 'Viva' });
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
    expect(() =>
      service.emptyTrash({ ...request(), projectId: project.id, items: Array(501).fill(shown[0]) }),
    ).toThrow();
  });
});
