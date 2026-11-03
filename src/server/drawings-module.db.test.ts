import { randomUUID } from 'node:crypto';
import { type IsoInstant, readIsoInstant } from '@tinyfold/core/domain';
import { coreModule, createUnitOfWork, tables } from '@tinyfold/core/infra';
import { useTestDatabases } from '@tinyfold/core/testing';
import { DrawingsModule } from '@tinyfold/drawings';
import { drawingsParticipant } from '@tinyfold/drawings/composition';
import { CreateCanvasInput } from '@tinyfold/drawings/contracts';
import { emptyCanvasScene } from '@tinyfold/drawings/domain';
import { workspaceModule } from '@tinyfold/workspace';
import { describe, expect, it } from 'vitest';
import { pngImage } from '../drawings/testing/png.js';

const databases = useTestDatabases([coreModule, workspaceModule], 'tinyfold-drawings-module-');
const at = readIsoInstant('2026-11-03T12:00:00.000Z');
const clock = () => new Date(at);

interface OrganizationRows {
  workspace_projects: {
    id: string;
    name: string;
    version: number;
    archived_at: IsoInstant | null;
    created_at: IsoInstant;
    updated_at: IsoInstant;
  };
  workspace_folders: { id: string; name: string; project_id: string; deleted_at: IsoInstant | null };
  core_mutations: { request_id: string; operation: string; response: string };
}

async function fixture() {
  const { db } = await databases.create();
  const projectId = randomUUID();
  await tables<OrganizationRows>(db)
    .insertInto('workspace_projects')
    .values({
      id: projectId,
      name: 'Desenhos',
      version: 1,
      archived_at: null,
      created_at: at,
      updated_at: at,
    })
    .execute();
  const unit = createUnitOfWork(db, { clock });
  const module = new DrawingsModule({
    unit,
    clock,
    organization(scope) {
      const scoped = tables<OrganizationRows>(unit.connection(scope));
      return {
        async findProject(id) {
          const row = await scoped
            .selectFrom('workspace_projects')
            .select(['id', 'name', 'archived_at'])
            .where('id', '=', id)
            .executeTakeFirst();
          return row && { id: row.id, name: row.name, archivedAt: row.archived_at };
        },
        async findFolder(id) {
          const row = await scoped.selectFrom('workspace_folders').selectAll().where('id', '=', id).executeTakeFirst();
          return row && { id: row.id, name: row.name, projectId: row.project_id, deletedAt: row.deleted_at };
        },
      };
    },
  });
  return { db, unit, module, projectId };
}

describe('drawings module in the shared SQLite unit of work', () => {
  it('preserves the legacy request fingerprint and does not publish a replay twice', async () => {
    const { db, module, projectId } = await fixture();
    const events: string[] = [];
    module.events.on('drawing.created', (event) => {
      events.push(event.eventId);
    });
    const input = { requestId: randomUUID(), projectId, title: 'Cena' };
    const first = await module.commands.create(input);
    expect(await module.commands.create(input)).toEqual(first);
    expect(events).toHaveLength(1);
    expect(await module.queries.list()).toHaveLength(1);
    expect(await tables<OrganizationRows>(db).selectFrom('core_mutations').selectAll().execute()).toEqual([
      expect.objectContaining({
        request_id: input.requestId,
        operation: 'workspace.createCanvas',
        response: JSON.stringify(first),
      }),
    ]);
    await expect(module.commands.create({ ...input, title: 'Outro' })).rejects.toMatchObject({
      code: 'REQUEST_REUSED',
    });
  });

  it('rolls back a participant and its events when the outer flow fails, then safely retries', async () => {
    const { db, unit, module, projectId } = await fixture();
    const events: string[] = [];
    module.events.on('drawing.created', (event) => {
      events.push(event.entityId);
    });
    const input = { requestId: randomUUID(), projectId, scene: emptyCanvasScene() };
    await expect(
      unit.write('workspace.createCanvas', input, async (scope) => {
        await drawingsParticipant(module, scope).operations.createCanvas.run(CreateCanvasInput.parse(input));
        throw new Error('Second participant failed');
      }),
    ).rejects.toThrow('Second participant failed');
    expect(await module.queries.list()).toEqual([]);
    expect(events).toEqual([]);
    expect(await tables<OrganizationRows>(db).selectFrom('core_mutations').selectAll().execute()).toEqual([]);
    const retried = await module.commands.create(input);
    expect(events).toEqual([retried.id]);
  });

  it('rejects writes in read scopes and captured participants after the scope ends', async () => {
    const { unit, module, projectId } = await fixture();
    const created = await module.commands.create({ requestId: randomUUID(), projectId });
    let captured: ReturnType<typeof drawingsParticipant>['repository'] | undefined;
    await unit.read(async (scope) => {
      captured = drawingsParticipant(module, scope).repository;
      await expect(captured.setCanvasPinnedAt({ id: created.id, pinnedAt: at })).rejects.toThrow('read transaction');
    });
    expect(() => captured?.findCanvas(created.id)).toThrow('no longer active');
    expect((await module.queries.get({ id: created.id })).pinnedAt).toBeNull();
  });

  it('publishes only changed previews, ignores old scenes and preserves the current image', async () => {
    const { module, projectId } = await fixture();
    const created = await module.commands.create({ requestId: randomUUID(), projectId });
    const events: number[] = [];
    module.events.on('drawing.previewStored', (event) => {
      events.push(event.payload.sceneVersion);
    });
    const input = { id: created.id, version: 1, png: pngImage(3, 2) };
    expect(await module.commands.storePreview(input)).toEqual({ stored: true, previewVersion: 1 });
    expect(await module.commands.storePreview(input)).toEqual({ stored: true, previewVersion: 1 });
    expect(events).toEqual([1]);
    const image = await module.queries.previewImage(created.id);
    expect(image?.png).toEqual(input.png);
    await module.commands.save({
      requestId: randomUUID(),
      id: created.id,
      expectedVersion: 1,
      title: 'Novo',
      scene: emptyCanvasScene(),
    });
    expect(await module.commands.storePreview(input)).toEqual({ stored: false, previewVersion: 1 });
    expect(events).toEqual([1]);
  });

  it('exposes current agent metadata and preserves lifecycle versions and preview cascade', async () => {
    const { module, projectId } = await fixture();
    const created = await module.commands.create({ requestId: randomUUID(), projectId, title: 'Esboço' });
    await module.commands.storePreview({ id: created.id, version: 1, png: pngImage(3, 2) });
    const read = await module.queries.readForAgent({ id: created.id });
    expect(read.drawing).toEqual({
      id: created.id,
      title: 'Esboço',
      projectId,
      projectName: 'Desenhos',
      projectArchived: false,
      folder: null,
      version: 1,
      updatedAt: at,
    });
    const trashed = await module.commands.trash({ requestId: randomUUID(), id: created.id, expectedVersion: 1 });
    expect(trashed.version).toBe(2);
    expect(await module.queries.previewImage(created.id)).toBeUndefined();
    expect((await module.queries.get({ id: created.id })).deletedAt).toBe(at);
    await expect(module.queries.readForAgent({ id: created.id })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await module.commands.purge({ requestId: randomUUID(), id: created.id, expectedVersion: 2 });
    await expect(module.queries.get({ id: created.id })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(await module.queries.previewImage(created.id)).toBeUndefined();
  });
});
