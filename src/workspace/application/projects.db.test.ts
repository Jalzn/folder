import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { coreModule, createDatabase, type Database, migrate } from '@tinyfold/core/infra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { workspaceModule } from '../infra/module.js';
import { createWorkspaceService } from '../infra/service.js';

const request = () => ({ requestId: randomUUID() });

describe('projects: colour and selector order', () => {
  let directory: string;
  let db: Database;
  let service: ReturnType<typeof createWorkspaceService>;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'tinyfold-projects-'));
    db = createDatabase(join(directory, 'test.sqlite'));
    await migrate(db, [coreModule, workspaceModule]);
    let now = new Date('2026-10-31T12:00:00Z');
    service = createWorkspaceService(db, () => {
      now = new Date(now.getTime() + 1000);
      return now;
    });
  });
  afterEach(async () => {
    await db.destroy();
    await rm(directory, { recursive: true, force: true });
  });
  const create = (name: string, color?: 'violet' | 'ochre' | 'gray' | 'green') =>
    service.createProject({ ...request(), name, ...(color ? { color } : {}) });
  const names = async (includeArchived = false) =>
    (await service.listProjects({ includeArchived })).map((project) => project.name);

  it('gives a new project the first colour no active project uses and the end of the selector', async () => {
    const first = await create('Tinyfold');
    const second = await create('Reforma', 'green');
    const third = await create('Leituras');
    expect([first, second, third].map((project) => [project.color, project.position])).toEqual([
      ['violet', 0],
      ['green', 1],
      ['ochre', 2],
    ]);
    expect((await create('Quarto')).color).toBe('gray');
    // An archived project's colour is free again; with all four in use, they repeat from the first.
    await service.updateProject({ ...request(), id: first.id, expectedVersion: 1, archived: true });
    expect((await create('Quinto')).color).toBe('violet');
    expect((await create('Sexto')).color).toBe('violet');
  });

  it('drops what draws nothing from names and titles, and reads a name of only that as none', async () => {
    // The service parses before it returns a promise, so a refusal is thrown right away.
    const refusal = async (call: () => Promise<unknown>) => {
      try {
        await call();
      } catch (error) {
        return error;
      }
    };
    expect(await refusal(() => create('\u{200B}\u{2060}'))).toMatchObject({
      issues: [expect.objectContaining({ path: ['name'] })],
    });
    const project = await create('Vis\u{200B}ão\u{00AD} ');
    expect(project.name).toBe('Visão');
    const renamed = await service.updateProject({
      ...request(),
      id: project.id,
      expectedVersion: 1,
      name: 'Ou\u{FEFF}tro\u{3164}',
    });
    expect(renamed.name).toBe('Outro');
    const document = await service.createDocument({ ...request(), projectId: project.id, title: '\u{200B}' });
    const drawing = await service.createCanvas({ ...request(), projectId: project.id, title: 'De\u{2060}senho' });
    expect([
      (await service.getDocument({ id: document.id })).title,
      (await service.getCanvas({ id: drawing.id })).title,
    ]).toEqual(['Sem título', 'Desenho']);
    await service.saveDocument({
      ...request(),
      id: document.id,
      expectedVersion: 1,
      title: 'No\u{00AD}tas',
      content: [],
    });
    expect((await service.getDocument({ id: document.id })).title).toBe('Notas');
    expect(
      await refusal(() => service.createTask({ ...request(), projectId: project.id, title: '\u{200B}' })),
    ).toMatchObject({ issues: [expect.objectContaining({ message: 'Escreva um título.' })] });
    // Joiners stay: they draw emoji and shape scripts.
    await service.createTask({ ...request(), projectId: project.id, title: '👩\u{200D}💻 Revisar' });
    expect((await service.listTasks({ projectId: project.id })).tasks.map((task) => task.title)).toEqual([
      '👩\u{200D}💻 Revisar',
    ]);
  });

  it('recolours and renames as edits, and archives any project, the last active one too', async () => {
    const project = await create('Tinyfold');
    const recoloured = await service.updateProject({
      ...request(),
      id: project.id,
      expectedVersion: 1,
      color: 'gray',
      name: 'Tinyfold 2',
    });
    expect(recoloured).toMatchObject({ color: 'gray', name: 'Tinyfold 2', version: 2, position: 0 });
    expect(recoloured.updatedAt > project.updatedAt).toBe(true);
    const archived = await service.updateProject({ ...request(), id: project.id, expectedVersion: 2, archived: true });
    expect(archived.archivedAt).toBe(archived.updatedAt);
    expect(await names()).toEqual([]);
    expect(await names(true)).toEqual(['Tinyfold 2']);
  });

  it('lists active projects in selector order, then archived ones from the most recently archived', async () => {
    const [a, b, c, d] = [await create('A'), await create('B'), await create('C'), await create('D')];
    await service.updateProject({ ...request(), id: b?.id ?? '', expectedVersion: 1, archived: true });
    await service.updateProject({ ...request(), id: d?.id ?? '', expectedVersion: 1, archived: true });
    expect(await names(true)).toEqual(['A', 'C', 'D', 'B']);
    // An unarchived project returns at the end of the selector.
    await service.updateProject({ ...request(), id: b?.id ?? '', expectedVersion: 2, archived: false });
    expect(await names(true)).toEqual(['A', 'C', 'B', 'D']);
    expect([a, c].map((project) => project?.position)).toEqual([0, 2]);
  });

  it('moves a project in the selector without making it an edit', async () => {
    const [a, b, c] = [await create('A'), await create('B'), await create('C')];
    if (!a || !b || !c) throw new Error('Projects missing.');
    const move = { ...request(), id: c.id, beforeProjectId: a.id };
    const moved = await service.moveProject(move);
    expect(moved.map((project) => [project.name, project.position])).toEqual([
      ['C', 0],
      ['A', 1],
      ['B', 2],
    ]);
    expect(await service.moveProject(move)).toEqual(moved);
    expect(await service.listProjects()).toEqual(moved);
    expect(moved.map((project) => project.version)).toEqual([1, 1, 1]);
    expect(moved.find((project) => project.id === a.id)?.updatedAt).toBe(a.updatedAt);
    expect((await service.moveProject({ ...request(), id: c.id, beforeProjectId: null })).map((p) => p.name)).toEqual([
      'A',
      'B',
      'C',
    ]);
    // A rename from another device keeps the order the last move set.
    await service.updateProject({ ...request(), id: a.id, expectedVersion: 1, name: 'A renomeado' });
    expect(await names()).toEqual(['A renomeado', 'B', 'C']);

    await expect(service.moveProject({ ...request(), id: a.id, beforeProjectId: a.id })).rejects.toMatchObject({
      code: 'VALIDATION',
    });
    await expect(service.moveProject({ ...request(), id: a.id, beforeProjectId: randomUUID() })).rejects.toMatchObject({
      code: 'VERSION_CONFLICT',
    });
    await service.updateProject({ ...request(), id: b.id, expectedVersion: 1, archived: true });
    await expect(service.moveProject({ ...request(), id: b.id, beforeProjectId: null })).rejects.toMatchObject({
      code: 'DOMAIN_RULE',
    });
    await expect(service.moveProject({ ...request(), id: a.id, beforeProjectId: b.id })).rejects.toMatchObject({
      code: 'VERSION_CONFLICT',
    });
    await expect(service.moveProject({ ...request(), id: randomUUID(), beforeProjectId: null })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
