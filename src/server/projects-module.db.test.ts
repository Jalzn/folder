import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { readCivilDate } from '#core/domain';
import { coreModule, createUnitOfWork, tables } from '#core/infra';
import { useTestDatabases } from '#core/testing';
import { ProjectsModule } from '#projects';
import { projectsParticipant } from '#projects/composition';
import { workspaceModule } from '#workspace';

const databases = useTestDatabases([coreModule, workspaceModule], 'tinyfold-projects-module-');
const clock = () => new Date('2026-11-03T12:00:00.000Z');

async function fixture() {
  const { db } = await databases.create();
  const unit = createUnitOfWork(db, { clock });
  const itemCounts = new Map<string, number>();
  const folderItemCounts = vi.fn(async (_ids: string[]) => itemCounts);
  const module = new ProjectsModule({
    unit,
    clock,
    calendar: async () => ({ timeZone: 'UTC', today: readCivilDate('2026-11-03') }),
    counts: () => ({ overdueCounts: async () => new Map(), folderItemCounts }),
  });
  return { db, unit, module, itemCounts, folderItemCounts };
}

describe('projects module in the shared SQLite unit of work', () => {
  it('returns the legacy response on replay without writing or notifying twice', async () => {
    const { db, module } = await fixture();
    const seen: { entityId: string; version: number }[] = [];
    module.events.on('project.created', ({ entityId, payload }) => {
      seen.push({ entityId, version: payload.version });
    });
    const input = { requestId: randomUUID(), name: 'Plano' };
    const created = await module.commands.projects.create(input);
    expect(await module.commands.projects.create(input)).toEqual(created);
    expect(seen).toEqual([{ entityId: created.id, version: 1 }]);
    expect(await module.queries.projects.list({})).toHaveLength(1);
    const rows = await tables<{ core_mutations: { request_id: string; operation: string } }>(db)
      .selectFrom('core_mutations')
      .select(['request_id', 'operation'])
      .execute();
    expect(rows).toEqual([{ request_id: input.requestId, operation: 'workspace.createProject' }]);
    await expect(module.commands.projects.create({ ...input, name: 'Outro' })).rejects.toMatchObject({
      code: 'REQUEST_REUSED',
    });
  });

  it('prevents writes before SQL even when the caller catches the read-scope error', async () => {
    const { module, unit } = await fixture();
    const project = await module.commands.projects.create({ requestId: randomUUID(), name: 'Projeto' });
    const folder = await module.commands.folders.create({
      requestId: randomUUID(),
      projectId: project.id,
      name: 'Pasta',
    });
    const errors: string[] = [];
    let captured: ReturnType<typeof projectsParticipant>['repository'] | undefined;
    await unit.read(async (scope) => {
      captured = projectsParticipant(module, scope).repository;
      for (const write of [
        () => captured?.setProjectPosition(project.id, 99),
        () => captured?.setFolderPosition(folder.id, 99),
      ]) {
        try {
          await write();
        } catch (error) {
          errors.push((error as Error).message);
        }
      }
    });
    expect(errors).toEqual([
      'A read transaction cannot perform a write.',
      'A read transaction cannot perform a write.',
    ]);
    expect((await module.queries.projects.list({}))[0]?.position).toBe(0);
    expect((await module.queries.folders.list({ projectId: project.id })).folders[0]?.position).toBe(0);
    expect(() => captured?.findProject(project.id)).toThrow('no longer active');
  });

  it('rolls back a folder participant with the outer flow and preserves safe retries', async () => {
    const { db, unit, module } = await fixture();
    const project = await module.commands.projects.create({ requestId: randomUUID(), name: 'Projeto' });
    const folder = await module.commands.folders.create({
      requestId: randomUUID(),
      projectId: project.id,
      name: 'Antes',
    });
    const seen: string[] = [];
    module.events.on('folder.renamed', ({ entityId }) => {
      seen.push(entityId);
    });
    const input = { requestId: randomUUID(), id: folder.id, expectedVersion: 1, name: 'Depois' };
    await expect(
      unit.write('workspace.renameFolder', input, async (scope) => {
        await projectsParticipant(module, scope).commands.folders.rename(input);
        throw new Error('Item movement failed');
      }),
    ).rejects.toThrow('Item movement failed');
    expect((await module.queries.folders.list({ projectId: project.id })).folders[0]).toMatchObject({
      name: 'Antes',
      version: 1,
    });
    expect(seen).toEqual([]);
    expect(
      await tables<{ core_mutations: { request_id: string } }>(db)
        .selectFrom('core_mutations')
        .select('request_id')
        .where('request_id', '=', input.requestId)
        .execute(),
    ).toEqual([]);
    const renamed = await module.commands.folders.rename(input);
    expect(await module.commands.folders.rename(input)).toEqual(renamed);
    expect(seen).toEqual([folder.id]);
  });

  it('keeps folder names, batched item counts, ordering versions and archived restrictions', async () => {
    const { module, itemCounts, folderItemCounts } = await fixture();
    const project = await module.commands.projects.create({ requestId: randomUUID(), name: 'Projeto' });
    const first = await module.commands.folders.create({
      requestId: randomUUID(),
      projectId: project.id,
      name: ' São  Paulo ',
    });
    const second = await module.commands.folders.create({
      requestId: randomUUID(),
      projectId: project.id,
      name: 'Outro',
    });
    await expect(
      module.commands.folders.create({ requestId: randomUUID(), projectId: project.id, name: 'sao paulo' }),
    ).rejects.toMatchObject({ code: 'DOMAIN_RULE' });
    itemCounts.set(first.id, 3);
    folderItemCounts.mockClear();
    const { folders } = await module.queries.folders.list({ projectId: project.id });
    expect(folderItemCounts).toHaveBeenCalledTimes(1);
    expect(new Set(folderItemCounts.mock.calls[0]?.[0])).toEqual(new Set([first.id, second.id]));
    expect(folders.find(({ id }) => id === first.id)).toMatchObject({ name: 'São Paulo', version: 1, items: 3 });
    await module.commands.folders.move({ requestId: randomUUID(), id: first.id, beforeFolderId: second.id });
    expect(
      (await module.queries.folders.list({ projectId: project.id })).folders.map(({ id, version }) => ({
        id,
        version,
      })),
    ).toEqual([
      { id: first.id, version: 1 },
      { id: second.id, version: 1 },
    ]);
    await module.commands.projects.update({
      requestId: randomUUID(),
      id: project.id,
      expectedVersion: 1,
      archived: true,
    });
    expect(await module.queries.projects.list({})).toEqual([]);
    await expect(
      module.commands.folders.create({ requestId: randomUUID(), projectId: project.id, name: 'Nova' }),
    ).rejects.toMatchObject({ code: 'DOMAIN_RULE' });
  });
});
