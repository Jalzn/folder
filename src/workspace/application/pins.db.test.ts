import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { coreModule, createDatabase, type Database, migrate } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Project } from '../domain/models.js';
import { MAX_PINNED } from '../domain/project.js';
import { workspaceModule } from '../infra/module.js';
import { createWorkspaceService } from '../infra/service.js';
import { testProject } from '../testing/projects.js';

const request = () => ({ requestId: randomUUID() });

describe('pins', () => {
  let directory: string;
  let db: Database;
  let service: ReturnType<typeof createWorkspaceService>;
  let project: Project;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'tinyfold-pins-'));
    db = createDatabase(join(directory, 'test.sqlite'));
    await migrate(db, [coreModule, workspaceModule]);
    service = createWorkspaceService(db);
    project = await testProject(service);
  });
  afterEach(async () => {
    await db.destroy();
    await rm(directory, { recursive: true, force: true });
  });
  const newDocument = () => service.createDocument({ ...request(), projectId: project.id });
  const newCanvas = () => service.createCanvas({ ...request(), projectId: project.id });

  it('pins without making it an edit, repeats safely and keeps no request record', async () => {
    const document = await newDocument();
    const before = await service.getDocument({ id: document.id });
    const pinned = await service.pinItem({ type: 'document', id: document.id });
    expect(pinned.pinnedAt).toEqual(expect.any(String));
    expect(await service.pinItem({ type: 'document', id: document.id })).toEqual(pinned);
    expect(await service.getDocument({ id: document.id })).toEqual({ ...before, pinnedAt: pinned.pinnedAt });
    expect((await service.listDocuments({ projectId: project.id }))[0]?.pinnedAt).toBe(pinned.pinnedAt);
    // The open page's autosave still saves on top of the version it had.
    await service.saveDocument({ ...request(), id: document.id, expectedVersion: 1, title: 'Salvo', content: [] });
    expect((await service.getDocument({ id: document.id })).pinnedAt).toBe(pinned.pinnedAt);
    expect(await service.unpinItem({ type: 'document', id: document.id })).toEqual({ pinnedAt: null });
    expect(await service.unpinItem({ type: 'document', id: document.id })).toEqual({ pinnedAt: null });
    expect((await service.getDocument({ id: document.id })).pinnedAt).toBeNull();
    const operations = await sql<{ operation: string }>`select operation from core_mutations`.execute(db);
    expect(operations.rows.map((row) => row.operation)).not.toContain('workspace.pinItem');
  });

  it(`refuses a pin beyond ${MAX_PINNED} per project, documents and drawings together`, async () => {
    for (let index = 0; index < MAX_PINNED; index += 1) {
      const item = index % 2 ? await newDocument() : await newCanvas();
      await service.pinItem({ type: index % 2 ? 'document' : 'drawing', id: item.id });
    }
    const ninth = await newDocument();
    await expect(service.pinItem({ type: 'document', id: ninth.id })).rejects.toMatchObject({
      code: 'DOMAIN_RULE',
      message: 'Máximo de 8 fixados neste projeto. Desafixe um item antes.',
    });
    const elsewhere = await service.createDocument({
      ...request(),
      projectId: (await testProject(service, 'Outro')).id,
    });
    expect((await service.pinItem({ type: 'document', id: elsewhere.id })).pinnedAt).not.toBeNull();
  });

  it('keeps the limit when two pins race for the last free place', async () => {
    for (let index = 0; index < MAX_PINNED - 1; index += 1)
      await service.pinItem({ type: 'document', id: (await newDocument()).id });
    const [first, second] = [await newDocument(), await newCanvas()];
    const results = await Promise.allSettled([
      service.pinItem({ type: 'document', id: first.id }),
      service.pinItem({ type: 'drawing', id: second.id }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({
      reason: { code: 'DOMAIN_RULE' },
    });
  });

  it('unpins an item moved to another project or to the trash, and does not pin it back on restore', async () => {
    const other = await testProject(service, 'Destino');
    const document = await newDocument();
    await service.pinItem({ type: 'document', id: document.id });
    await service.saveDocument({ ...request(), id: document.id, expectedVersion: 1, title: 'Fica', content: [] });
    expect((await service.getDocument({ id: document.id })).pinnedAt).not.toBeNull();
    await service.saveDocument({
      ...request(),
      id: document.id,
      expectedVersion: 2,
      title: 'Movido',
      content: [],
      projectId: other.id,
    });
    expect((await service.getDocument({ id: document.id })).pinnedAt).toBeNull();

    const canvas = await newCanvas();
    await service.pinItem({ type: 'drawing', id: canvas.id });
    const trashed = await service.deleteCanvas({ ...request(), id: canvas.id, expectedVersion: 1 });
    expect((await service.getCanvas({ id: canvas.id })).pinnedAt).toBeNull();
    await expect(service.pinItem({ type: 'drawing', id: canvas.id })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await service.restoreCanvas({ ...request(), id: canvas.id, expectedVersion: trashed.version });
    expect((await service.getCanvas({ id: canvas.id })).pinnedAt).toBeNull();
    await expect(service.pinItem({ type: 'document', id: canvas.id })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
