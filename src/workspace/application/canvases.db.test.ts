import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { coreModule, createDatabase, type Database, migrate, tables } from '@tinyfold/core/infra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { emptyCanvasScene } from '../domain/canvas.js';
import { workspaceModule } from '../infra/module.js';
import { createWorkspaceService } from '../infra/service.js';
import { drawingFixture } from '../testing/canvas-scenes.js';

const request = () => ({ requestId: randomUUID() });
describe('canvas persistence and concurrency', () => {
  let directory: string;
  let filename: string;
  let db: Database;
  let service: ReturnType<typeof createWorkspaceService>;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'tinyfold-canvas-'));
    filename = join(directory, 'test.sqlite');
    db = createDatabase(filename);
    await migrate(db, [coreModule, workspaceModule]);
    service = createWorkspaceService(db);
  });
  afterEach(async () => {
    await db.destroy();
    await rm(directory, { recursive: true, force: true });
  });
  it('persists a complete editable scene and reopens it after database restart', async () => {
    const created = await service.createCanvas(request());
    expect(await service.getCanvas({ id: created.id })).toMatchObject({
      title: 'Sem título',
      projectId: null,
      scene: emptyCanvasScene(),
    });
    const scene = drawingFixture();
    const saved = await service.saveCanvas({ ...request(), id: created.id, expectedVersion: 1, title: 'Fluxo', scene });
    expect(saved).toEqual({ id: created.id, version: 2, updatedAt: expect.any(String) });
    await db.destroy();
    db = createDatabase(filename);
    await migrate(db, [coreModule, workspaceModule]);
    service = createWorkspaceService(db);
    expect(await service.getCanvas({ id: created.id })).toMatchObject({
      scene,
      plainText: 'Fluxo de ação',
      version: 2,
    });
    expect((await service.listCanvases())[0]).not.toHaveProperty('scene');
  });
  it('replays creation and saves once with compact responses and refuses request reuse', async () => {
    const input = { ...request(), title: 'Importado', scene: drawingFixture() };
    const created = await service.createCanvas(input);
    expect(await service.createCanvas(input)).toEqual(created);
    const edit = { ...request(), id: created.id, expectedVersion: 1, title: 'Alterado', scene: drawingFixture() };
    const ack = await service.saveCanvas(edit);
    expect(await service.saveCanvas(edit)).toEqual(ack);
    expect(await service.listCanvases()).toHaveLength(1);
    expect((await service.getCanvas({ id: created.id })).version).toBe(2);
    await expect(service.saveCanvas({ ...edit, title: 'Pedido diferente' })).rejects.toMatchObject({
      code: 'REQUEST_REUSED',
    });
    const records = await tables<{ core_mutations: { response: string } }>(db)
      .selectFrom('core_mutations')
      .select('response')
      .execute();
    expect(records.every((record) => record.response.length < 200)).toBe(true);
  });
  it('rejects a stale save across connections without overwriting the newer scene', async () => {
    const canvas = await service.createCanvas(request());
    const second = createDatabase(filename);
    try {
      const other = createWorkspaceService(second);
      const stale = await other.getCanvas({ id: canvas.id });
      await service.saveCanvas({
        ...request(),
        id: canvas.id,
        expectedVersion: 1,
        title: 'Novo',
        scene: drawingFixture(),
      });
      await expect(
        other.saveCanvas({
          ...request(),
          id: canvas.id,
          expectedVersion: stale.version,
          title: 'Antigo',
          scene: stale.scene,
        }),
      ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
      expect(await other.getCanvas({ id: canvas.id })).toMatchObject({
        title: 'Novo',
        scene: drawingFixture(),
        version: 2,
      });
    } finally {
      await second.destroy();
    }
  });
  it('serializes competing edits and acknowledges only one expected version', async () => {
    const canvas = await service.createCanvas(request());
    const results = await Promise.allSettled(
      ['A', 'B'].map((title) =>
        service.saveCanvas({ ...request(), id: canvas.id, expectedVersion: 1, title, scene: emptyCanvasScene() }),
      ),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({
      reason: { code: 'VERSION_CONFLICT' },
    });
    expect((await service.getCanvas({ id: canvas.id })).version).toBe(2);
  });
  it('searches titles and active text without accents and treats wildcards literally', async () => {
    const canvas = await service.createCanvas({ ...request(), title: 'Rascunho 100%', scene: drawingFixture() });
    expect((await service.listCanvases({ query: 'ACAO' })).map((item) => item.id)).toEqual([canvas.id]);
    expect(await service.listCanvases({ query: '%' })).toHaveLength(1);
    expect(await service.listCanvases({ query: '_' })).toHaveLength(0);
  });
  it('filters by project and unassigned content, preserves archived projects and restores trash', async () => {
    const project = await service.createProject({ ...request(), name: 'Projeto' });
    const canvas = await service.createCanvas({ ...request(), projectId: project.id, scene: drawingFixture() });
    const unassigned = await service.createCanvas(request());
    expect((await service.listCanvases({ projectId: null })).map((item) => item.id)).toEqual([unassigned.id]);
    expect((await service.listCanvases({ projectId: project.id })).map((item) => item.id)).toEqual([canvas.id]);
    await service.updateProject({ ...request(), id: project.id, expectedVersion: 1, archived: true });
    const edit = await service.saveCanvas({
      ...request(),
      id: canvas.id,
      expectedVersion: 1,
      title: 'Continua',
      scene: drawingFixture(),
    });
    await expect(service.createCanvas({ ...request(), projectId: project.id })).rejects.toMatchObject({
      code: 'VALIDATION',
    });
    await expect(service.createCanvas({ ...request(), projectId: randomUUID() })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    const deletion = { ...request(), id: canvas.id, expectedVersion: edit.version };
    const deleted = await service.deleteCanvas(deletion);
    expect(await service.deleteCanvas(deletion)).toEqual(deleted);
    expect(await service.getCanvas({ id: canvas.id })).toMatchObject({
      deletedAt: expect.any(String),
      version: deleted.version,
      scene: drawingFixture(),
    });
    expect((await service.listCanvases()).map((item) => item.id)).toEqual([unassigned.id]);
    await expect(
      service.saveCanvas({
        ...request(),
        id: canvas.id,
        expectedVersion: deleted.version,
        title: 'Não',
        scene: emptyCanvasScene(),
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect((await service.listCanvases({ deleted: true })).map((item) => item.id)).toEqual([canvas.id]);
    const restoration = { ...request(), id: canvas.id, expectedVersion: deleted.version };
    expect(await service.restoreCanvas(restoration)).toEqual(await service.restoreCanvas(restoration));
    expect(await service.getCanvas({ id: canvas.id })).toMatchObject({
      scene: drawingFixture(),
      projectId: project.id,
      deletedAt: null,
    });
  });
  it('adds the canvas migration to an existing workspace without changing documents or tasks', async () => {
    await db.destroy();
    const oldDirectory = join(directory, 'old-migrations');
    await mkdir(oldDirectory);
    await copyFile(
      new URL('../infra/migrations/001_workspace.sql', import.meta.url),
      join(oldDirectory, '001_workspace.sql'),
    );
    db = createDatabase(join(directory, 'upgrade.sqlite'));
    await migrate(db, [coreModule, { ...workspaceModule, migrations: pathToFileURL(`${oldDirectory}/`) }]);
    service = createWorkspaceService(db);
    const document = await service.createDocument({ ...request(), title: 'Preservado' });
    const task = await service.createTask({ ...request(), title: 'Preservada' });
    expect(await migrate(db, [coreModule, workspaceModule])).toEqual([
      { module: 'workspace', version: 2, name: 'canvases' },
      { module: 'workspace', version: 3, name: 'canvas_previews' },
    ]);
    expect(await service.getDocument({ id: document.id })).toEqual(document);
    expect((await service.listTasks()).tasks[0]?.id).toBe(task.task.id);
    const canvas = await service.createCanvas({ ...request(), scene: drawingFixture() });
    expect((await service.getCanvas({ id: canvas.id })).scene).toEqual(drawingFixture());
  });
});
