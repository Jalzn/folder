import { randomUUID } from 'node:crypto';
import type { Database } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import { beforeEach, describe, expect, it } from 'vitest';
import { sceneFingerprint } from '../domain/canvas/scene-fingerprint.js';
import { INITIAL_COLUMN_IDS } from '../domain/columns.js';
import type { Project } from '../domain/project-models.js';
import type { WorkspaceService } from '../infra/service.js';
import { request } from '../testing/builders.js';
import { drawingFixture } from '../testing/canvas-scenes.js';
import { useWorkspaceDb } from '../testing/database.js';
import { pngImage } from '../testing/png.js';
import { testProject } from '../testing/projects.js';

describe('resolveEmbeds', () => {
  const workspace = useWorkspaceDb({ prefix: 'tinyfold-embeds-' });
  let db: Database;
  let service: WorkspaceService;
  let project: Project;
  beforeEach(async () => {
    ({ db, service } = workspace);
    project = await testProject(service);
  });

  const resolve = (ids: { taskIds?: string[]; canvasIds?: string[] }) =>
    service.resolveEmbeds({ taskIds: ids.taskIds ?? [], canvasIds: ids.canvasIds ?? [] });
  const mutations = async () =>
    (await sql<{ count: number }>`select count(*) as count from core_mutations`.execute(db)).rows[0]?.count;

  it('answers live, trashed and missing tasks, one per distinct ID in the order asked, without a request record', async () => {
    const mcp = await service.createLabel({ ...request(), name: 'mcp' });
    const old = await service.createLabel({ ...request(), name: 'antiga' });
    const live = await service.createTask({
      ...request(),
      projectId: project.id,
      title: 'Gerar token',
      columnId: INITIAL_COLUMN_IDS.doing,
      dueOn: '2026-11-04',
      labelIds: [mcp.id, old.id],
      description: [
        { type: 'checkListItem', props: { checked: true }, content: [{ type: 'text', text: 'a', styles: {} }] },
        { type: 'checkListItem', props: { checked: false }, content: [{ type: 'text', text: 'b', styles: {} }] },
      ],
    });
    await service.deleteLabel({ ...request(), id: old.id, expectedVersion: 1 });
    const trashed = await service.createTask({ ...request(), projectId: project.id, title: 'Revisar onboarding' });
    await service.deleteTask({ ...request(), id: trashed.id, expectedVersion: 1 });
    const purged = await service.createTask({ ...request(), projectId: project.id, title: 'Apagada' });
    await service.deleteTask({ ...request(), id: purged.id, expectedVersion: 1 });
    await service.purgeTask({ ...request(), id: purged.id, expectedVersion: 2 });
    const never = randomUUID();
    const before = await mutations();

    const { tasks, drawings } = await resolve({ taskIds: [never, live.id, trashed.id, live.id, purged.id] });
    expect(drawings).toEqual([]);
    expect(tasks).toEqual([
      { state: 'missing', id: never },
      {
        state: 'live',
        id: live.id,
        title: 'Gerar token',
        version: 1,
        column: { id: INITIAL_COLUMN_IDS.doing, name: 'Em andamento', isDone: false },
        dueOn: '2026-11-04',
        completedAt: null,
        labels: [{ id: mcp.id, name: 'mcp', color: 'blue' }],
        checklist: { done: 1, total: 2 },
        project: { id: project.id, name: project.name, color: project.color, archived: false },
      },
      { state: 'trashed', id: trashed.id, title: 'Revisar onboarding', version: 2 },
      { state: 'missing', id: purged.id },
    ]);
    expect(await mutations()).toBe(before);
  });

  it('follows a task to another project and column, and into an archived project', async () => {
    const task = await service.createTask({ ...request(), projectId: project.id, title: 'Mudou' });
    const other = await testProject(service, 'Outro');
    await service.updateTask({
      ...request(),
      id: task.id,
      expectedVersion: 1,
      projectId: other.id,
      columnId: INITIAL_COLUMN_IDS.done,
    });
    await service.updateProject({ ...request(), id: other.id, expectedVersion: other.version, archived: true });
    const [moved] = (await resolve({ taskIds: [task.id] })).tasks;
    expect(moved).toMatchObject({
      state: 'live',
      version: 2,
      column: { id: INITIAL_COLUMN_IDS.done, name: 'Concluído', isDone: true },
      completedAt: expect.any(String),
      project: { id: other.id, name: 'Outro', archived: true },
    });
  });

  it('answers drawings with their project, folder and preview, current, stale or none, and an empty scene', async () => {
    const folder = await service.createFolder({ ...request(), projectId: project.id, name: 'Arquitetura' });
    const scene = drawingFixture();
    const filed = await service.createCanvas({
      ...request(),
      projectId: project.id,
      folderId: folder.id,
      title: 'Fluxo',
      scene,
    });
    const blank = await service.createCanvas({ ...request(), projectId: project.id, title: 'Vazio' });
    await service.saveCanvasPreview({
      id: filed.id,
      version: 1,
      sceneFingerprint: sceneFingerprint(scene),
      png: pngImage(800, 600),
    });
    const resolved = async () => (await resolve({ canvasIds: [filed.id, blank.id] })).drawings;
    expect(await resolved()).toEqual([
      {
        state: 'live',
        id: filed.id,
        title: 'Fluxo',
        version: 1,
        project: { id: project.id, name: project.name, color: project.color, archived: false },
        folder: { id: folder.id, name: 'Arquitetura' },
        preview: { fingerprint: sceneFingerprint(scene), sceneVersion: 1, width: 800, height: 600, current: true },
        empty: false,
      },
      {
        state: 'live',
        id: blank.id,
        title: 'Vazio',
        version: 1,
        project: { id: project.id, name: project.name, color: project.color, archived: false },
        folder: null,
        preview: null,
        empty: true,
      },
    ]);

    // A rename raises the version, not the scene: the preview still shows it.
    await service.saveCanvas({ ...request(), id: filed.id, expectedVersion: 1, title: 'Fluxo do autosave', scene });
    expect((await resolved())[0]).toMatchObject({ version: 2, preview: { sceneVersion: 1, current: true } });
    // A scene edit leaves it stale until the document makes another.
    const edited = {
      ...scene,
      elements: scene.elements.map((element, index) => (index ? element : { ...element, x: 999 })),
    };
    await service.saveCanvas({
      ...request(),
      id: filed.id,
      expectedVersion: 2,
      title: 'Fluxo do autosave',
      scene: edited,
    });
    expect((await resolved())[0]).toMatchObject({ version: 3, preview: { sceneVersion: 1, current: false } });
    // A scene of deleted elements only is empty too.
    await service.saveCanvas({
      ...request(),
      id: blank.id,
      expectedVersion: 1,
      title: 'Vazio',
      scene: { ...scene, elements: scene.elements.map((element) => ({ ...element, isDeleted: true })) },
    });
    expect((await resolved())[1]).toMatchObject({ empty: true });
  });

  it('answers drawings in the trash, deleted for good or of a deleted folder, by the state they are in', async () => {
    const folder = await service.createFolder({ ...request(), projectId: project.id, name: 'Antiga' });
    const kept = await service.createCanvas({
      ...request(),
      projectId: project.id,
      folderId: folder.id,
      title: 'Na raiz',
    });
    const binned = await service.createCanvas({
      ...request(),
      projectId: project.id,
      folderId: folder.id,
      title: 'Junto',
    });
    const purged = await service.createCanvas({ ...request(), projectId: project.id, title: 'Apagado' });
    await service.deleteCanvas({ ...request(), id: purged.id, expectedVersion: 1 });
    await service.purgeCanvas({ ...request(), id: purged.id, expectedVersion: 2 });
    // The folder goes with its drawings to the trash; the one restored comes back at the root.
    await service.deleteFolder({ ...request(), id: folder.id, expectedVersion: 1, withItems: true });
    const restored = await service.restoreCanvas({ ...request(), id: kept.id, expectedVersion: 2 });
    const { drawings } = await resolve({ canvasIds: [kept.id, binned.id, purged.id] });
    expect(drawings).toEqual([
      expect.objectContaining({ state: 'live', id: kept.id, version: restored.version, folder: null }),
      {
        state: 'trashed',
        id: binned.id,
        title: 'Junto',
        version: (await service.getCanvas({ id: binned.id })).version,
      },
      { state: 'missing', id: purged.id },
    ]);
  });

  it('refuses more than 200 IDs of a kind and an ID that is no UUID', () => {
    const ids = Array.from({ length: 201 }, () => randomUUID());
    expect(() => resolve({ taskIds: ids })).toThrow('Um documento aceita até 200 itens incorporados.');
    expect(() => resolve({ canvasIds: ids })).toThrow('Um documento aceita até 200 itens incorporados.');
    expect(() => resolve({ taskIds: ['não é um id'] })).toThrow('Identificador de item inválido.');
    // IDs are stored in lowercase, and SQLite compares them as text: another spelling is refused.
    const upper = randomUUID().toUpperCase();
    expect(() => resolve({ taskIds: [upper] })).toThrow('Identificador de item inválido.');
    expect(() => resolve({ canvasIds: [upper] })).toThrow('Identificador de item inválido.');
    expect(() => service.resolveEmbeds({ taskIds: [] } as never)).toThrow();
  });

  it('resolves 200 of each kind in one call', async () => {
    const ids = Array.from({ length: 200 }, () => randomUUID());
    const { tasks, drawings } = await resolve({ taskIds: ids, canvasIds: ids });
    expect([tasks.length, drawings.length]).toEqual([200, 200]);
    expect(tasks.every((task) => task.state === 'missing')).toBe(true);
  });
});
