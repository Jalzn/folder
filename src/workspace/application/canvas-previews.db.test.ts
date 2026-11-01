import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { coreModule, createDatabase, type Database, migrate, tables } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Project } from '../domain/models.js';
import { sceneFingerprint } from '../domain/scene-fingerprint.js';
import { workspaceModule } from '../infra/module.js';
import { createWorkspaceService } from '../infra/service.js';
import { drawingFixture } from '../testing/canvas-scenes.js';
import { legacyRows, migrateWorkspaceTo } from '../testing/legacy-workspace.js';
import { pngChunk, pngFile, pngFrom, pngHeaderChunk, pngImage, storedZlib } from '../testing/png.js';
import { testProject } from '../testing/projects.js';

const request = () => ({ requestId: randomUUID() });

describe('drawing previews', () => {
  let directory: string;
  let db: Database;
  let service: ReturnType<typeof createWorkspaceService>;
  let project: Project;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'tinyfold-previews-'));
    db = createDatabase(join(directory, 'test.sqlite'));
    await migrate(db, [coreModule, workspaceModule]);
    service = createWorkspaceService(db);
    project = await testProject(service);
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
    const created = await service.createCanvas({
      ...request(),
      projectId: project.id,
      title: 'Fluxo',
      scene: drawingFixture(),
    });
    const before = await service.getCanvas({ id: created.id });
    expect(before.previewVersion).toBeNull();
    const png = pngImage(1568, 940);
    expect(await service.saveCanvasPreview({ id: created.id, version: 1, png })).toEqual({
      stored: true,
      previewVersion: 1,
    });
    expect(await service.saveCanvasPreview({ id: created.id, version: 1, png })).toEqual({
      stored: true,
      previewVersion: 1,
    });
    const after = await service.getCanvas({ id: created.id });
    expect(after).toEqual({ ...before, previewVersion: 1, previewCurrent: true });
    const row = await storedPreview(created.id);
    expect(row).toMatchObject({ scene_version: 1, width: 1568 });
    expect(Buffer.from(row?.png ?? []).equals(Buffer.from(png))).toBe(true);
    const mutations = await sql<{ operation: string }>`select operation from core_mutations`.execute(db);
    expect(mutations.rows.map((row) => row.operation)).not.toContain('workspace.saveCanvasPreview');
  });

  it('ignores an outdated preview and replaces an older one with a newer one', async () => {
    const created = await service.createCanvas({ ...request(), projectId: project.id, scene: drawingFixture() });
    await service.saveCanvasPreview({ id: created.id, version: 1, png: pngImage(100, 100) });
    const saved = await service.saveCanvas({
      ...request(),
      id: created.id,
      expectedVersion: 1,
      title: 'Alterado',
      scene: drawingFixture(),
    });
    expect(await service.saveCanvasPreview({ id: created.id, version: 1, png: pngImage(50, 50) })).toEqual({
      stored: false,
      previewVersion: 1,
    });
    expect(
      await service.saveCanvasPreview({ id: created.id, version: saved.version, png: pngImage(200, 120) }),
    ).toEqual({ stored: true, previewVersion: 2 });
    expect(await storedPreview(created.id)).toMatchObject({ scene_version: 2, width: 200 });
  });

  it('stores a preview rendered before a move when its fingerprint is the current scene', async () => {
    const destination = await testProject(service, 'Destino');
    const created = await service.createCanvas({ ...request(), projectId: project.id, scene: drawingFixture() });
    const scene = drawingFixture();
    scene.elements.pop();
    const saved = await service.saveCanvas({ ...request(), id: created.id, expectedVersion: 1, title: 'Fluxo', scene });
    // The preview of the saved scene is still rendering when the drawing moves.
    const moved = await service.moveItem({
      ...request(),
      type: 'drawing',
      id: created.id,
      projectId: destination.id,
      expectedVersion: saved.version,
    });
    const upload = (sceneOf: typeof scene | undefined) => ({
      id: created.id,
      version: saved.version,
      png: pngImage(40, 30),
      ...(sceneOf ? { sceneFingerprint: sceneFingerprint(sceneOf) } : {}),
    });
    expect(await service.saveCanvasPreview(upload(undefined))).toEqual({ stored: false, previewVersion: null });
    expect(await service.saveCanvasPreview(upload(drawingFixture()))).toEqual({ stored: false, previewVersion: null });
    expect(await service.saveCanvasPreview(upload(scene))).toEqual({ stored: true, previewVersion: saved.version });
    expect(await service.getCanvas({ id: created.id })).toMatchObject({
      version: moved.version,
      previewVersion: saved.version,
      previewCurrent: true,
    });
    // An older upload never replaces it, even of the same scene.
    expect(await service.saveCanvasPreview({ ...upload(scene), version: 1, png: pngImage(20, 20) })).toEqual({
      stored: false,
      previewVersion: saved.version,
    });
    expect(await storedPreview(created.id)).toMatchObject({ scene_version: saved.version, width: 40 });
  });

  it('refuses a future version, a trashed drawing and invalid images', async () => {
    const created = await service.createCanvas({ ...request(), projectId: project.id, scene: drawingFixture() });
    await expect(
      service.saveCanvasPreview({ id: created.id, version: 2, png: pngImage(10, 10) }),
    ).rejects.toMatchObject({
      code: 'VALIDATION',
    });
    const headerThenHtml = new Uint8Array([
      ...pngImage(1568, 1568).subarray(0, 33),
      ...new TextEncoder().encode('<html><script>alert(document.domain)</script></html>'),
    ]);
    // Ten rows of a 10-pixel, 1-bit image: a filter byte and two bytes of pixels each.
    const blackRows = (count: number) => storedZlib(new Uint8Array(count));
    const grey = (idat: Uint8Array) =>
      pngFrom([pngHeaderChunk(10, 10, { bitDepth: 1, colourType: 0 }), pngChunk('IDAT', idat), pngChunk('IEND')]);
    const unknownFilter = new Uint8Array(30);
    unknownFilter[3] = 5;
    const other = await service.createCanvas({ ...request(), projectId: project.id, scene: drawingFixture() });
    const valid = await service.saveCanvasPreview({ id: other.id, version: 1, png: grey(blackRows(30)) });
    expect(valid.stored).toBe(true);
    const invalid = [
      new Uint8Array(64),
      headerThenHtml,
      pngFile(10, 10, 200),
      grey(blackRows(29)),
      grey(new Uint8Array([...blackRows(30), ...new TextEncoder().encode('<html>')])),
      grey(storedZlib(unknownFilter)),
      pngImage(1569, 10),
      pngFile(100, 100, 256 * 1024 + 1),
    ];
    for (const png of invalid)
      await expect(service.saveCanvasPreview({ id: created.id, version: 1, png })).rejects.toMatchObject({
        code: 'VALIDATION',
      });
    const deleted = await service.deleteCanvas({ ...request(), id: created.id, expectedVersion: 1 });
    await expect(
      service.saveCanvasPreview({ id: created.id, version: deleted.version, png: pngImage(10, 10) }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      service.saveCanvasPreview({ id: randomUUID(), version: 1, png: pngImage(10, 10) }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(await storedPreview(created.id)).toBeUndefined();
  });

  it('deletes the preview with its drawing', async () => {
    const created = await service.createCanvas({ ...request(), projectId: project.id, scene: drawingFixture() });
    await service.saveCanvasPreview({ id: created.id, version: 1, png: pngImage(10, 10) });
    await sql`delete from workspace_canvases where id = ${created.id}`.execute(db);
    expect(await storedPreview(created.id)).toBeUndefined();
  });

  it('adds the preview table to a database with the first two workspace migrations', async () => {
    await db.destroy();
    db = createDatabase(join(directory, 'upgrade.sqlite'));
    await migrateWorkspaceTo(db, 2, directory);
    const canvas = await legacyRows(db).canvas({ projectId: null, title: 'Antigo', scene: drawingFixture() });
    expect(await migrate(db, [coreModule, workspaceModule])).toEqual([
      { module: 'workspace', version: 3, name: 'canvas_previews' },
      { module: 'workspace', version: 4, name: 'canvas_preview_fingerprint' },
      { module: 'workspace', version: 5, name: 'projects_required' },
      { module: 'workspace', version: 6, name: 'folders' },
    ]);
    service = createWorkspaceService(db);
    expect(await service.getCanvas({ id: canvas.id })).toMatchObject({
      title: 'Antigo',
      version: 1,
      previewVersion: null,
    });
    expect((await service.saveCanvasPreview({ id: canvas.id, version: 1, png: pngImage(10, 10) })).stored).toBe(true);
  });

  it('keeps a preview current through rename, project moves and the trash, until the scene changes', async () => {
    const destination = await testProject(service, 'Destino');
    const created = await service.createCanvas({
      ...request(),
      projectId: project.id,
      title: 'Fluxo',
      scene: drawingFixture(),
    });
    await service.saveCanvasPreview({ id: created.id, version: 1, png: pngImage(10, 10) });
    const renamed = await service.saveCanvas({
      ...request(),
      id: created.id,
      expectedVersion: 1,
      title: 'Outro nome',
      scene: drawingFixture(),
    });
    const moved = await service.moveItem({
      ...request(),
      type: 'drawing',
      id: created.id,
      projectId: destination.id,
      expectedVersion: renamed.version,
    });
    const trashed = await service.deleteCanvas({ ...request(), id: created.id, expectedVersion: moved.version });
    const restored = await service.restoreCanvas({ ...request(), id: created.id, expectedVersion: trashed.version });
    expect(await service.getCanvas({ id: created.id })).toMatchObject({
      version: 5,
      previewVersion: 1,
      previewCurrent: true,
    });
    const scene = drawingFixture();
    scene.elements.pop();
    await service.saveCanvas({
      ...request(),
      id: created.id,
      expectedVersion: restored.version,
      title: 'Outro nome',
      scene,
    });
    expect(await service.getCanvas({ id: created.id })).toMatchObject({ previewVersion: 1, previewCurrent: false });
  });

  it('adds fingerprints to existing previews, which fall back to the version until replaced', async () => {
    await db.destroy();
    db = createDatabase(join(directory, 'fingerprints.sqlite'));
    await migrateWorkspaceTo(db, 3, directory);
    const old = legacyRows(db);
    const canvas = await old.canvas({ title: 'Antigo', scene: drawingFixture() });
    await old.preview(canvas.id, pngImage(10, 10));
    expect(await migrate(db, [coreModule, workspaceModule])).toEqual([
      { module: 'workspace', version: 4, name: 'canvas_preview_fingerprint' },
      { module: 'workspace', version: 5, name: 'projects_required' },
      { module: 'workspace', version: 6, name: 'folders' },
    ]);
    service = createWorkspaceService(db);
    expect(await service.getCanvas({ id: canvas.id })).toMatchObject({ previewVersion: 1, previewCurrent: true });
  });
});
