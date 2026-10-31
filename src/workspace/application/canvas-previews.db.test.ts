import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { coreModule, createDatabase, type Database, migrate, tables } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { workspaceModule } from '../infra/module.js';
import { createWorkspaceService } from '../infra/service.js';
import { drawingFixture } from '../testing/canvas-scenes.js';
import { pngFile } from '../testing/png.js';

const request = () => ({ requestId: randomUUID() });

describe('drawing previews', () => {
  let directory: string;
  let db: Database;
  let service: ReturnType<typeof createWorkspaceService>;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'tinyfold-previews-'));
    db = createDatabase(join(directory, 'test.sqlite'));
    await migrate(db, [coreModule, workspaceModule]);
    service = createWorkspaceService(db);
  });
  afterEach(async () => {
    await db.destroy();
    await rm(directory, { recursive: true, force: true });
  });
  const storedPreview = (canvasId: string) =>
    tables<{ workspace_canvas_previews: { canvas_id: string; scene_version: number; png: Uint8Array; width: number } }>(
      db,
    )
      .selectFrom('workspace_canvas_previews')
      .selectAll()
      .where('canvas_id', '=', canvasId)
      .executeTakeFirst();

  it('stores the preview of the current version without touching the drawing', async () => {
    const created = await service.createCanvas({ ...request(), title: 'Fluxo', scene: drawingFixture() });
    const before = await service.getCanvas({ id: created.id });
    expect(before.previewVersion).toBeNull();
    const png = pngFile(1568, 940, 2048);
    expect(await service.saveCanvasPreview({ id: created.id, version: 1, png })).toEqual({
      stored: true,
      previewVersion: 1,
    });
    expect(await service.saveCanvasPreview({ id: created.id, version: 1, png })).toEqual({
      stored: true,
      previewVersion: 1,
    });
    const after = await service.getCanvas({ id: created.id });
    expect(after).toEqual({ ...before, previewVersion: 1 });
    const row = await storedPreview(created.id);
    expect(row).toMatchObject({ scene_version: 1, width: 1568 });
    expect(Buffer.from(row?.png ?? []).equals(Buffer.from(png))).toBe(true);
    const mutations = await sql<{ count: number }>`select count(*) as count from core_mutations`.execute(db);
    expect(mutations.rows[0]?.count).toBe(1);
  });

  it('ignores an outdated preview and replaces an older one with a newer one', async () => {
    const created = await service.createCanvas({ ...request(), scene: drawingFixture() });
    await service.saveCanvasPreview({ id: created.id, version: 1, png: pngFile(100, 100) });
    const saved = await service.saveCanvas({
      ...request(),
      id: created.id,
      expectedVersion: 1,
      title: 'Alterado',
      scene: drawingFixture(),
    });
    expect(await service.saveCanvasPreview({ id: created.id, version: 1, png: pngFile(50, 50) })).toEqual({
      stored: false,
      previewVersion: 1,
    });
    expect(await service.saveCanvasPreview({ id: created.id, version: saved.version, png: pngFile(200, 120) })).toEqual(
      { stored: true, previewVersion: 2 },
    );
    expect(await storedPreview(created.id)).toMatchObject({ scene_version: 2, width: 200 });
  });

  it('refuses a future version, a trashed drawing and invalid images', async () => {
    const created = await service.createCanvas({ ...request(), scene: drawingFixture() });
    await expect(service.saveCanvasPreview({ id: created.id, version: 2, png: pngFile(10, 10) })).rejects.toMatchObject(
      {
        code: 'VALIDATION',
      },
    );
    const headerThenHtml = new Uint8Array([
      ...pngFile(1568, 1568).subarray(0, 33),
      ...new TextEncoder().encode('<html><script>alert(document.domain)</script></html>'),
    ]);
    for (const png of [new Uint8Array(64), headerThenHtml, pngFile(1569, 10), pngFile(100, 100, 256 * 1024 + 1)])
      await expect(service.saveCanvasPreview({ id: created.id, version: 1, png })).rejects.toMatchObject({
        code: 'VALIDATION',
      });
    const deleted = await service.deleteCanvas({ ...request(), id: created.id, expectedVersion: 1 });
    await expect(
      service.saveCanvasPreview({ id: created.id, version: deleted.version, png: pngFile(10, 10) }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      service.saveCanvasPreview({ id: randomUUID(), version: 1, png: pngFile(10, 10) }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(await storedPreview(created.id)).toBeUndefined();
  });

  it('deletes the preview with its drawing', async () => {
    const created = await service.createCanvas({ ...request(), scene: drawingFixture() });
    await service.saveCanvasPreview({ id: created.id, version: 1, png: pngFile(10, 10) });
    await sql`delete from workspace_canvases where id = ${created.id}`.execute(db);
    expect(await storedPreview(created.id)).toBeUndefined();
  });

  it('adds the preview table to a database with the first two workspace migrations', async () => {
    await db.destroy();
    const oldMigrations = join(directory, 'old-workspace');
    await mkdir(oldMigrations);
    for (const name of ['001_workspace.sql', '002_canvases.sql'])
      await copyFile(new URL(`../infra/migrations/${name}`, import.meta.url), join(oldMigrations, name));
    db = createDatabase(join(directory, 'upgrade.sqlite'));
    await migrate(db, [coreModule, { ...workspaceModule, migrations: pathToFileURL(`${oldMigrations}/`) }]);
    const canvas = await createWorkspaceService(db).createCanvas({
      ...request(),
      title: 'Antigo',
      scene: drawingFixture(),
    });
    expect(await migrate(db, [coreModule, workspaceModule])).toEqual([
      { module: 'workspace', version: 3, name: 'canvas_previews' },
    ]);
    service = createWorkspaceService(db);
    expect(await service.getCanvas({ id: canvas.id })).toMatchObject({
      title: 'Antigo',
      version: 1,
      previewVersion: null,
    });
    expect((await service.saveCanvasPreview({ id: canvas.id, version: 1, png: pngFile(10, 10) })).stored).toBe(true);
  });
});
