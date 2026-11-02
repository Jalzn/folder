import type { Database } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Project } from '../domain/models.js';
import { MAX_PINNED } from '../domain/project.js';
import type { WorkspaceService } from '../infra/service.js';
import { request } from '../testing/builders.js';
import { useWorkspaceDb } from '../testing/database.js';
import { testFolder } from '../testing/folders.js';
import { testProject } from '../testing/projects.js';

describe('pins', () => {
  const workspace = useWorkspaceDb({ prefix: 'tinyfold-pins-' });
  let db: Database;
  let service: WorkspaceService;
  let project: Project;
  beforeEach(async () => {
    ({ db, service } = workspace);
    project = await testProject(service);
  });
  const newDocument = (folderId?: string) =>
    service.createDocument({ ...request(), projectId: project.id, ...(folderId ? { folderId } : {}) });
  const newCanvas = (folderId?: string) =>
    service.createCanvas({ ...request(), projectId: project.id, ...(folderId ? { folderId } : {}) });

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

  it(`refuses a pin beyond ${MAX_PINNED} at the root, documents and drawings together`, async () => {
    for (let index = 0; index < MAX_PINNED; index += 1) {
      const item = index % 2 ? await newDocument() : await newCanvas();
      await service.pinItem({ type: index % 2 ? 'document' : 'drawing', id: item.id });
    }
    const ninth = await newDocument();
    await expect(service.pinItem({ type: 'document', id: ninth.id })).rejects.toMatchObject({
      code: 'DOMAIN_RULE',
      message: 'Máximo de 8 fixados na raiz do projeto. Desafixe um item antes.',
    });
    const elsewhere = await service.createDocument({
      ...request(),
      projectId: (await testProject(service, 'Outro')).id,
    });
    expect((await service.pinItem({ type: 'document', id: elsewhere.id })).pinnedAt).not.toBeNull();
  });

  it(`counts ${MAX_PINNED} pins in each folder apart from the root, and names the full folder`, async () => {
    const mcp = await testFolder(service, project.id, 'MCP');
    for (let index = 0; index < MAX_PINNED; index += 1) {
      await service.pinItem({ type: 'document', id: (await newDocument()).id });
      await service.pinItem({ type: 'drawing', id: (await newCanvas(mcp.id)).id });
    }
    await expect(service.pinItem({ type: 'document', id: (await newDocument(mcp.id)).id })).rejects.toMatchObject({
      code: 'DOMAIN_RULE',
      message: 'Máximo de 8 fixados em MCP. Desafixe um item antes.',
    });
    await expect(service.pinItem({ type: 'document', id: (await newDocument()).id })).rejects.toMatchObject({
      message: 'Máximo de 8 fixados na raiz do projeto. Desafixe um item antes.',
    });
    // Another folder has room of its own.
    const other = await testFolder(service, project.id, 'Outra');
    expect((await service.pinItem({ type: 'document', id: (await newDocument(other.id)).id })).pinnedAt).not.toBeNull();
  });

  it('keeps the limit of a folder when two pins race for its last free place', async () => {
    const mcp = await testFolder(service, project.id, 'MCP');
    for (let index = 0; index < MAX_PINNED - 1; index += 1)
      await service.pinItem({ type: 'document', id: (await newDocument(mcp.id)).id });
    const [first, second] = [await newDocument(mcp.id), await newCanvas(mcp.id)];
    const results = await Promise.allSettled([
      service.pinItem({ type: 'document', id: first.id }),
      service.pinItem({ type: 'drawing', id: second.id }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
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
    await service.moveItem({
      ...request(),
      type: 'document',
      id: document.id,
      projectId: other.id,
      expectedVersion: 2,
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
