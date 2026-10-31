import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { coreModule, createDatabase, type Database, migrate } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sceneFingerprint } from '../domain/scene-fingerprint.js';
import { createWorkspaceTools } from '../infra/mcp/index.js';
import { workspaceModule } from '../infra/module.js';
import { createWorkspaceService } from '../infra/service.js';
import { drawingFixture } from '../testing/canvas-scenes.js';
import { legacyRows, migrateWorkspaceTo } from '../testing/legacy-workspace.js';
import { pngImage } from '../testing/png.js';
import { testProject } from '../testing/projects.js';

const request = () => ({ requestId: randomUUID() });
const generalId = '00000000-0000-4000-8000-000000000001';
const paragraph = (text: string, id: string) => ({
  id,
  type: 'paragraph',
  content: [{ type: 'text', text, styles: {} }],
});

let directory: string;
let db: Database;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'tinyfold-projects-required-'));
  db = createDatabase(join(directory, 'test.sqlite'));
});
afterEach(async () => {
  await db.destroy();
  await rm(directory, { recursive: true, force: true });
});

/** Runs migration 005 over a database the rows were written to with migrations 001 to 004. */
async function migrateTo005() {
  expect(await migrate(db, [coreModule, workspaceModule])).toEqual([
    { module: 'workspace', version: 5, name: 'projects_required' },
  ]);
  expect((await sql<{ integrity_check: string }>`pragma integrity_check`.execute(db)).rows).toEqual([
    { integrity_check: 'ok' },
  ]);
  expect((await sql`pragma foreign_key_check`.execute(db)).rows).toEqual([]);
  return createWorkspaceService(db);
}

const boardRevision = async () =>
  (await sql<{ board_revision: number }>`select board_revision from workspace_state`.execute(db)).rows[0]
    ?.board_revision;

describe('migration 005', () => {
  beforeEach(() => migrateWorkspaceTo(db, 4, directory));

  it('creates no project in an empty database', async () => {
    const service = await migrateTo005();
    expect(await service.listProjects({ includeArchived: true })).toEqual([]);
    expect(await boardRevision()).toBe(0);
  });

  it('orders projects as the sidebar did and rotates colours by creation, without Geral when nothing is loose', async () => {
    const old = legacyRows(db);
    const first = await old.project('Primeiro', { updatedAt: '2026-10-05T10:00:00.000Z' });
    const second = await old.project('Segundo', { updatedAt: '2026-10-07T10:00:00.000Z' });
    const archived = await old.project('Arquivado', {
      archivedAt: '2026-10-08T10:00:00.000Z',
      updatedAt: '2026-10-08T10:00:00.000Z',
    });
    const fourth = await old.project('Quarto', { updatedAt: '2026-10-06T10:00:00.000Z' });
    await old.document({ projectId: first.id, title: 'No projeto' });
    const service = await migrateTo005();
    const projects = await service.listProjects({ includeArchived: true });
    expect(projects.map((project) => [project.name, project.position, project.color, project.version])).toEqual([
      ['Segundo', 0, 'ochre', 1],
      ['Quarto', 1, 'violet', 1],
      ['Primeiro', 2, 'violet', 1],
      ['Arquivado', 3, 'green', 1],
    ]);
    expect(projects.find((project) => project.id === fourth.id)?.updatedAt).toBe(fourth.updated_at);
    expect(projects.find((project) => project.id === second.id)?.updatedAt).toBe(second.updated_at);
    expect(projects.some((project) => project.id === archived.id && project.archivedAt)).toBe(true);
  });

  it('moves loose items, trashed ones too, to Geral without changing versions or dates', async () => {
    const old = legacyRows(db);
    const project = await old.project('Alfa');
    const kept = await old.document({ projectId: project.id, title: 'Em Alfa' });
    const document = await old.document({ title: 'Solto', version: 3, content: [paragraph('Ideia solta', 'b')] });
    const trashedDocument = await old.document({ title: 'Lixo', version: 2, deletedAt: '2026-10-02T00:00:00.000Z' });
    const canvas = await old.canvas({ title: 'Rabisco', scene: drawingFixture() });
    const trashedCanvas = await old.canvas({ title: 'Velho', version: 2, deletedAt: '2026-10-02T00:00:00.000Z' });
    const task = await old.task({ title: 'Solta', status: 'doing' });
    const trashedTask = await old.task({ title: 'Removida', version: 2, deletedAt: '2026-10-02T00:00:00.000Z' });
    await sql`update workspace_state set board_revision = 7`.execute(db);
    const service = await migrateTo005();

    const [alfa, general] = await service.listProjects();
    expect(alfa).toMatchObject({ id: project.id, position: 0 });
    expect(general).toMatchObject({
      id: generalId,
      name: 'Geral',
      color: 'gray',
      position: 1,
      version: 1,
      archivedAt: null,
    });
    expect(general?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u);
    for (const [row, read] of [
      [document, await service.getDocument({ id: document.id })],
      [canvas, await service.getCanvas({ id: canvas.id })],
      [trashedCanvas, await service.getCanvas({ id: trashedCanvas.id })],
    ] as const)
      expect(read).toMatchObject({ projectId: generalId, version: row.version, updatedAt: row.updated_at });
    expect(await service.listDocuments({ deleted: true })).toEqual([
      expect.objectContaining({ id: trashedDocument.id, projectId: generalId, version: 2 }),
    ]);
    expect((await service.getDocument({ id: kept.id })).projectId).toBe(project.id);
    expect((await service.listTasks({ projectId: generalId })).tasks).toEqual([
      expect.objectContaining({ id: task.id, version: 1, updatedAt: task.updated_at }),
    ]);
    const trashedTaskRow = await sql<{ project_id: string; version: number }>`
      select project_id, version from workspace_tasks where id = ${trashedTask.id}`.execute(db);
    expect(trashedTaskRow.rows).toEqual([{ project_id: generalId, version: 2 }]);
    expect(await boardRevision()).toBe(8);
  });

  it('leaves archived-only databases without Geral, and creates it active for their loose items', async () => {
    const old = legacyRows(db);
    await old.project('Arquivado', { archivedAt: '2026-10-08T10:00:00.000Z' });
    const service = await migrateTo005();
    expect(await service.listProjects()).toEqual([]);
    expect(await service.listProjects({ includeArchived: true })).toHaveLength(1);

    await db.destroy();
    db = createDatabase(join(directory, 'loose.sqlite'));
    await migrateWorkspaceTo(db, 4, directory);
    const loose = legacyRows(db);
    await loose.project('Arquivado', { archivedAt: '2026-10-08T10:00:00.000Z' });
    await loose.canvas({ title: 'Solto' });
    const withLoose = await migrateTo005();
    expect(await withLoose.listProjects()).toEqual([
      expect.objectContaining({ id: generalId, archivedAt: null, position: 1 }),
    ]);
    expect(await boardRevision()).toBe(0);
  });

  it('keeps task sources with the document title, and previews with their fingerprint', async () => {
    const old = legacyRows(db);
    const document = await old.document({ title: 'Plano', content: [paragraph('Publicar o portfólio', 'b')] });
    const task = await old.task({ title: 'Publicar' });
    await old.source(task.id, document.id, 'Publicar o portfólio', 'b');
    const canvas = await old.canvas({ title: 'Fluxo', scene: drawingFixture() });
    const png = pngImage(20, 10);
    await old.preview(canvas.id, png, { fingerprint: sceneFingerprint(drawingFixture()) });
    const service = await migrateTo005();

    const sources = await sql`select * from workspace_task_sources`.execute(db);
    expect(sources.rows).toEqual([
      {
        task_id: task.id,
        document_id: document.id,
        document_title: 'Plano',
        block_id: 'b',
        excerpt: 'Publicar o portfólio',
      },
    ]);
    expect((await service.listTasks()).tasks[0]?.source).toEqual({
      documentId: document.id,
      documentTitle: 'Plano',
      blockId: 'b',
      excerpt: 'Publicar o portfólio',
      available: true,
      blockAvailable: true,
    });
    const preview = await sql<{ scene_fingerprint: string; png: Uint8Array }>`
      select scene_fingerprint, png from workspace_canvas_previews where canvas_id = ${canvas.id}`.execute(db);
    expect(preview.rows[0]?.scene_fingerprint).toBe(sceneFingerprint(drawingFixture()));
    expect(Buffer.from(preview.rows[0]?.png ?? []).equals(Buffer.from(png))).toBe(true);
    expect(await service.getCanvas({ id: canvas.id })).toMatchObject({ previewVersion: 1, previewCurrent: true });
  });

  it('refuses a null project from then on, in inserts, updates and the set-null of a deleted project', async () => {
    const old = legacyRows(db);
    const project = await old.project('Alfa');
    const empty = await old.project('Vazio');
    const document = await old.document({ projectId: project.id });
    await old.canvas({ projectId: project.id });
    await old.task({ projectId: project.id, title: 'No projeto' });
    await migrateTo005();
    for (const table of ['workspace_documents', 'workspace_canvases', 'workspace_tasks'])
      await expect(sql`update ${sql.table(table)} set project_id = null`.execute(db)).rejects.toThrow(
        `${table}.project_id is required`,
      );
    await expect(legacyRows(db).task({ title: 'Sem projeto' })).rejects.toThrow(
      'workspace_tasks.project_id is required',
    );
    await expect(sql`delete from workspace_projects where id = ${project.id}`.execute(db)).rejects.toThrow(
      /\.project_id is required$/u,
    );
    await sql`delete from workspace_projects where id = ${empty.id}`.execute(db);
    expect((await createWorkspaceService(db).getDocument({ id: document.id })).projectId).toBe(project.id);
  });

  it('does not run again, nor create Geral twice, after a restart', async () => {
    await legacyRows(db).document({ title: 'Solto' });
    await migrateTo005();
    await db.destroy();
    db = createDatabase(join(directory, 'test.sqlite'));
    expect(await migrate(db, [coreModule, workspaceModule])).toEqual([]);
    expect(await createWorkspaceService(db).listProjects({ includeArchived: true })).toEqual([
      expect.objectContaining({ id: generalId }),
    ]);
  });
});

describe('items need a project', () => {
  let service: ReturnType<typeof createWorkspaceService>;
  beforeEach(async () => {
    await migrate(db, [coreModule, workspaceModule]);
    service = createWorkspaceService(db);
  });

  it('creates every item in an active project, a task from an excerpt in its document project', async () => {
    const project = await testProject(service);
    const other = await testProject(service, 'Outro');
    const document = await service.createDocument({
      ...request(),
      projectId: project.id,
      content: [paragraph('Revisar o texto', 'b')],
    });
    const canvas = await service.createCanvas({ ...request(), projectId: other.id });
    const source = { documentId: document.id, blockId: 'b', excerpt: 'Revisar' };
    const fromExcerpt = await service.createTask({ ...request(), title: 'Revisar', source });
    const elsewhere = await service.createTask({ ...request(), title: 'Em outro', projectId: other.id, source });
    expect([document.projectId, (await service.getCanvas({ id: canvas.id })).projectId]).toEqual([
      project.id,
      other.id,
    ]);
    expect([fromExcerpt.task.projectId, elsewhere.task.projectId]).toEqual([project.id, other.id]);
    expect(() => service.createTask({ ...request(), title: 'Sem projeto' })).toThrow('Escolha o projeto da tarefa.');
  });

  it('reads null from the earlier interface as the first active project, the current one or no match', async () => {
    const first = await testProject(service, 'Primeiro');
    const second = await testProject(service, 'Segundo');
    await service.moveProject({ ...request(), id: second.id, beforeProjectId: first.id });
    const document = await service.createDocument({
      ...request(),
      projectId: null,
      content: [paragraph('Ideia solta', 'b')],
    });
    const canvas = await service.createCanvas({ ...request(), projectId: null });
    const task = await service.createTask({ ...request(), title: 'Solta', projectId: null });
    expect([document.projectId, (await service.getCanvas({ id: canvas.id })).projectId, task.task.projectId]).toEqual([
      second.id,
      second.id,
      second.id,
    ]);
    const fromExcerpt = await service.createTask({
      ...request(),
      title: 'Do trecho',
      projectId: null,
      source: { documentId: document.id, excerpt: 'Ideia' },
    });
    expect(fromExcerpt.task.projectId).toBe(second.id);

    const saved = await service.saveDocument({
      ...request(),
      id: document.id,
      expectedVersion: 1,
      title: 'Salvo',
      content: [],
      projectId: null,
    });
    expect((await service.getDocument({ id: document.id })).projectId).toBe(second.id);
    await service.saveCanvas({
      ...request(),
      id: canvas.id,
      expectedVersion: 1,
      title: 'Salvo',
      scene: drawingFixture(),
      projectId: null,
    });
    await service.updateTask({ ...request(), id: task.task.id, expectedVersion: 1, projectId: null, title: 'Editada' });
    expect((await service.getCanvas({ id: canvas.id })).projectId).toBe(second.id);
    expect((await service.listTasks({ projectId: second.id })).tasks.map((item) => item.title)).toContain('Editada');
    expect(saved.version).toBe(2);

    expect(await service.listDocuments({ projectId: null })).toEqual([]);
    expect(await service.listCanvases({ projectId: null })).toEqual([]);
    expect((await service.listTasks({ projectId: null })).tasks).toEqual([]);
  });

  it('allows archiving the last active project and then refuses new items, null included', async () => {
    const project = await testProject(service);
    const document = await service.createDocument({ ...request(), projectId: project.id });
    const archived = await service.updateProject({ ...request(), id: project.id, expectedVersion: 1, archived: true });
    expect(archived.archivedAt).not.toBeNull();
    expect(await service.listProjects()).toEqual([]);
    expect(await service.listProjects({ includeArchived: true })).toEqual([archived]);
    for (const create of [
      () => service.createDocument({ ...request(), projectId: null }),
      () => service.createCanvas({ ...request(), projectId: null }),
      () => service.createTask({ ...request(), title: 'Nova', projectId: null }),
    ])
      await expect(create()).rejects.toMatchObject({
        code: 'VALIDATION',
        message: 'Crie ou desarquive um projeto antes de criar itens.',
      });
    await expect(service.createDocument({ ...request(), projectId: project.id })).rejects.toMatchObject({
      code: 'VALIDATION',
      message: 'Desarquive o projeto antes de adicionar conteúdo a ele.',
    });
    // Existing items stay editable.
    expect(
      await service.saveDocument({
        ...request(),
        id: document.id,
        expectedVersion: 1,
        title: 'Ainda aqui',
        content: [],
      }),
    ).toMatchObject({ version: 2 });

    const tools = createWorkspaceTools(db);
    const listProjects = tools.find((tool) => tool.name === 'list_projects');
    const listed = async (input: Record<string, unknown>) => {
      const result = await listProjects?.handler(listProjects.inputSchema.parse(input));
      return JSON.parse(result?.content[0]?.type === 'text' ? result.content[0].text : '{}');
    };
    expect(await listed({})).toEqual({ projects: [], nextCursor: null });
    expect(await listed({ includeArchived: true })).toEqual({
      projects: [expect.objectContaining({ id: project.id, archived: true, position: null, documents: 1 })],
      nextCursor: null,
    });
  });
});
