import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { coreModule, createDatabase, type Database, migrate } from '@tinyfold/core/infra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_COLUMN_IDS } from '../domain/columns.js';
import type { Project } from '../domain/project-models.js';
import { workspaceModule } from '../infra/module.js';
import { createWorkspaceService } from '../infra/service.js';
import { testProject } from '../testing/projects.js';

const request = () => ({ requestId: randomUUID() });

describe('board reads', () => {
  let directory: string;
  let db: Database;
  let service: ReturnType<typeof createWorkspaceService>;
  let project: Project;
  let now: Date;
  let timeZone: string;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'tinyfold-board-'));
    db = createDatabase(join(directory, 'test.sqlite'));
    await migrate(db, [coreModule, workspaceModule]);
    now = new Date('2026-10-31T15:00:00Z');
    timeZone = 'America/Sao_Paulo';
    service = createWorkspaceService(
      db,
      () => now,
      async () => timeZone,
    );
    project = await testProject(service);
  });
  afterEach(async () => {
    await db.destroy();
    await rm(directory, { recursive: true, force: true });
  });

  /** A task created at `instant`: in the done column it is completed then. */
  const taskAt = async (instant: string, title: string, columnId: string = INITIAL_COLUMN_IDS.done) => {
    now = new Date(instant);
    return service.createTask({ ...request(), title, projectId: project.id, columnId });
  };

  it("shows the done column's last 14 civil days in the owner's time zone, counting the older ones", async () => {
    await taskAt('2026-10-01T12:00:00Z', 'Antiga');
    // 23:30 of Oct 17 in São Paulo, already Oct 18 in UTC: just before the window there.
    await taskAt('2026-10-18T02:30:00Z', 'Na véspera da janela');
    await taskAt('2026-10-18T03:30:00Z', 'No primeiro dia da janela');
    await taskAt('2026-10-31T02:30:00Z', 'Ontem às 23:30');
    await taskAt('2026-10-20T12:00:00Z', 'Aberta', INITIAL_COLUMN_IDS.todo);
    const trashed = await taskAt('2026-10-30T12:00:00Z', 'Na lixeira');
    await service.deleteTask({ ...request(), id: trashed.id, expectedVersion: trashed.version });
    now = new Date('2026-10-31T15:00:00Z');

    const board = await service.projectBoard({ projectId: project.id });
    expect(board).toMatchObject({ today: '2026-10-31', doneSince: '2026-10-18T03:00:00.000Z', olderDone: 2 });
    expect(board.tasks.map((task) => [task.title, task.completedAt])).toEqual([
      ['Aberta', null],
      ['Ontem às 23:30', '2026-10-31T02:30:00.000Z'],
      ['No primeiro dia da janela', '2026-10-18T03:30:00.000Z'],
    ]);
    expect(board.revision).toBe((await service.listTasks({})).revision);

    // In UTC, the window starts three hours earlier and takes the task of 23:30.
    timeZone = 'UTC';
    const inUtc = await service.projectBoard({ projectId: project.id });
    expect(inUtc).toMatchObject({ doneSince: '2026-10-18T00:00:00.000Z', olderDone: 1 });
    expect(inUtc.tasks.map((task) => task.title)).toContain('Na véspera da janela');
    // At 01:00 UTC on Nov 1st, São Paulo is still on Oct 31st.
    timeZone = 'America/Sao_Paulo';
    now = new Date('2026-11-01T01:00:00Z');
    expect(await service.projectBoard({ projectId: project.id })).toMatchObject({ today: '2026-10-31' });
  });

  it('reads a time zone Intl does not know as UTC instead of failing', async () => {
    timeZone = 'Mars/Olympus';
    expect(await service.projectBoard({ projectId: project.id })).toMatchObject({
      today: '2026-10-31',
      doneSince: '2026-10-18T00:00:00.000Z',
    });
    expect(await service.projectNavigation({ projectId: project.id })).toMatchObject({ overdueTasks: 0 });
  });

  it('pages the completed tasks, the latest first, without repeating or skipping on changes', async () => {
    const done = [];
    for (let day = 1; day <= 5; day += 1) done.push(await taskAt(`2026-10-0${day}T12:00:00Z`, `Concluída ${day}`));
    const page = (cursor?: string) =>
      service.listCompletedTasks({ projectId: project.id, limit: 2, ...(cursor ? { cursor } : {}) });
    const first = await page();
    expect(first.items.map((task) => task.title)).toEqual(['Concluída 5', 'Concluída 4']);
    expect(first).toMatchObject({ total: 5, nextCursor: `c~2026-10-04T12:00:00.000Z~${done[3]?.id}` });

    // Reopening one already shown and completing a new one move nothing in the next pages.
    const reopened = done[4];
    await service.moveTask({
      ...request(),
      id: reopened?.id ?? '',
      expectedVersion: reopened?.version ?? 0,
      columnId: INITIAL_COLUMN_IDS.todo,
    });
    await taskAt('2026-10-31T12:00:00Z', 'Nova');
    const second = await page(first.nextCursor ?? undefined);
    expect(second.items.map((task) => task.title)).toEqual(['Concluída 3', 'Concluída 2']);
    const third = await page(second.nextCursor ?? undefined);
    expect(third).toMatchObject({ total: 5, nextCursor: null });
    expect(third.items.map((task) => task.title)).toEqual(['Concluída 1']);

    for (const cursor of ['x', 'c~ontem~id', `t~1~0~0~${done[0]?.id}`])
      await expect(page(cursor)).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(service.listCompletedTasks({ projectId: randomUUID(), limit: 2 })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('hides a deleted label from the board and the task', async () => {
    const mcp = await service.createLabel({ ...request(), name: 'mcp' });
    const kanban = await service.createLabel({ ...request(), name: 'kanban' });
    const task = await service.createTask({
      ...request(),
      title: 'Etiquetada',
      projectId: project.id,
      labelIds: [mcp.id, kanban.id],
    });
    await service.deleteLabel({ ...request(), id: mcp.id, expectedVersion: 1 });
    const board = await service.projectBoard({ projectId: project.id });
    expect(board.tasks.map((item) => item.labelIds)).toEqual([[kanban.id]]);
    expect((await service.getTask({ id: task.id })).labelIds).toEqual([kanban.id]);
  });
});
