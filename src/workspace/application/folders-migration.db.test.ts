import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDatabase, type Database } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { folderNameKey } from '../domain/folders.js';
import { createWorkspaceService } from '../infra/service.js';
import { drawingFixture } from '../testing/canvas-scenes.js';
import { legacyRows, migrateWorkspaceTo } from '../testing/legacy-workspace.js';
import { pngImage } from '../testing/png.js';

let directory: string;
let db: Database;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'tinyfold-folders-migration-'));
  db = createDatabase(join(directory, 'test.sqlite'));
  await migrateWorkspaceTo(db, 5, directory);
});
afterEach(async () => {
  await db.destroy();
  await rm(directory, { recursive: true, force: true });
});

const rows = async (table: string) =>
  (await sql<Record<string, unknown>>`select * from ${sql.table(table)} order by 1`.execute(db)).rows;
const consistent = async () => {
  expect((await sql<{ integrity_check: string }>`pragma integrity_check`.execute(db)).rows).toEqual([
    { integrity_check: 'ok' },
  ]);
  expect((await sql`pragma foreign_key_check`.execute(db)).rows).toEqual([]);
};

/** Runs migration 006, and only it, over a database written with migrations 001 to 005. */
async function migrateTo006() {
  expect(await migrateWorkspaceTo(db, 6, directory)).toEqual([{ module: 'workspace', version: 6, name: 'folders' }]);
  await consistent();
}

/** A folder written straight to the table, as the triggers see any write. */
async function folder(projectId: string, name: string, deletedAt: string | null = null) {
  const id = randomUUID();
  const now = '2026-10-31T12:00:00.000Z';
  await sql`insert into workspace_folders (id, project_id, name, name_key, position, version, created_at, updated_at, deleted_at)
    values (${id}, ${projectId}, ${name}, ${folderNameKey(name)}, 0, 1, ${now}, ${now}, ${deletedAt})`.execute(db);
  return id;
}

describe('migration 006', () => {
  it('adds the folder table and the folder column to an empty database, and nothing else', async () => {
    await migrateTo006();
    expect(await rows('workspace_folders')).toEqual([]);
    const columns = async (table: string) =>
      (await sql<{ name: string }>`select name from pragma_table_info(${table})`.execute(db)).rows.map(
        (row) => row.name,
      );
    expect(await columns('workspace_documents')).toContain('folder_id');
    expect(await columns('workspace_canvases')).toContain('folder_id');
    expect(await columns('workspace_tasks')).not.toContain('folder_id');
  });

  it('keeps live, trashed and pinned items, previews and task sources as they were, at the root', async () => {
    const old = legacyRows(db, { at: 5 });
    const project = await old.project('Tinyfold');
    const live = await old.document({ projectId: project.id, title: 'Visão', pinnedAt: '2026-10-20T10:00:00.000Z' });
    await old.document({ projectId: project.id, title: 'Na lixeira', deletedAt: '2026-10-21T10:00:00.000Z' });
    const canvas = await old.canvas({ projectId: project.id, title: 'Fluxo', scene: drawingFixture(), version: 3 });
    await old.preview(canvas.id, pngImage(10, 10), { sceneVersion: 3, fingerprint: 'abc' });
    const task = await old.task({ projectId: project.id, title: 'Revisar' });
    await old.source(task.id, live.id, 'Visão');
    await sql`update workspace_state set board_revision = 7`.execute(db);
    const before = Object.fromEntries(
      await Promise.all(
        ['workspace_projects', 'workspace_documents', 'workspace_canvases', 'workspace_canvas_previews']
          .concat(['workspace_tasks', 'workspace_task_sources', 'workspace_state'])
          .map(async (table) => [table, await rows(table)] as const),
      ),
    );

    await migrateTo006();
    for (const [table, earlier] of Object.entries(before)) {
      const now = await rows(table);
      const atRoot = ['workspace_documents', 'workspace_canvases'].includes(table);
      expect(now, table).toEqual(atRoot ? earlier.map((row) => ({ ...row, folder_id: null })) : earlier);
    }
    // The workspace reads the old rows: the pin and the version stay, at the root.
    expect(await createWorkspaceService(db).getDocument({ id: live.id })).toMatchObject({
      pinnedAt: '2026-10-20T10:00:00.000Z',
      version: 1,
      folderId: null,
    });
  });

  it('refuses through SQL a folder of another project, a live item in a deleted folder and a folder that moves or empties too soon', async () => {
    const old = legacyRows(db, { at: 5 });
    const [mine, other] = [await old.project('Meu'), await old.project('Outro')];
    await migrateTo006();
    const [inMine, inOther] = [await folder(mine.id, 'MCP'), await folder(other.id, 'MCP')];
    const gone = await folder(mine.id, 'Antiga', '2026-10-30T10:00:00.000Z');
    const document = await old.document({ projectId: mine.id, title: 'Plano' });
    const canvas = await old.canvas({ projectId: mine.id, title: 'Fluxo' });
    const refused = (statement: ReturnType<typeof sql>) => expect(statement.execute(db)).rejects.toThrow();

    // Inserting into another project's folder, or into a deleted one.
    await expect(
      sql`insert into workspace_documents (id, project_id, title, content, plain_text, search_text, format_version,
        version, created_at, updated_at, folder_id)
        values (${randomUUID()}, ${mine.id}, 'x', '[]', '', 'x', 1, 1, 'a', 'a', ${inOther})`.execute(db),
    ).rejects.toThrow('workspace_documents.folder_id must be an active folder of its project');
    await expect(
      sql`insert into workspace_canvases (id, project_id, title, scene, plain_text, search_text, format_version,
        version, created_at, updated_at, folder_id)
        values (${randomUUID()}, ${mine.id}, 'x', '{}', '', 'x', 1, 1, 'a', 'a', ${gone})`.execute(db),
    ).rejects.toThrow('workspace_canvases.folder_id must be an active folder of its project');
    // Updating into another project's folder, or a live item into a deleted folder.
    await refused(sql`update workspace_documents set folder_id = ${inOther} where id = ${document.id}`);
    await refused(sql`update workspace_canvases set folder_id = ${gone} where id = ${canvas.id}`);
    // Changing project without leaving the folder.
    await sql`update workspace_documents set folder_id = ${inMine} where id = ${document.id}`.execute(db);
    await refused(sql`update workspace_documents set project_id = ${other.id} where id = ${document.id}`);
    // A folder never changes project, and is deleted only once nothing live is inside.
    await refused(sql`update workspace_folders set project_id = ${other.id} where id = ${inMine}`);
    await refused(sql`update workspace_folders set deleted_at = 'b' where id = ${inMine}`);
    // A trashed item keeps its deleted folder as its origin; restoring it must leave the folder.
    await sql`update workspace_documents set deleted_at = 'b' where id = ${document.id}`.execute(db);
    await sql`update workspace_folders set deleted_at = 'b' where id = ${inMine}`.execute(db);
    await refused(sql`update workspace_documents set deleted_at = null where id = ${document.id}`);
    await sql`update workspace_documents set deleted_at = null, folder_id = null where id = ${document.id}`.execute(db);
    await consistent();
  });

  it('allows one active folder per name, case and accents aside, and reuses the name of a deleted one', async () => {
    const project = await legacyRows(db, { at: 5 }).project('Tinyfold');
    await migrateTo006();
    const first = await folder(project.id, 'Ações');
    await expect(folder(project.id, 'acoes')).rejects.toThrow();
    await sql`update workspace_folders set deleted_at = 'b' where id = ${first}`.execute(db);
    await folder(project.id, 'ACOES');
    expect((await rows('workspace_folders')).map((row) => [row.name, row.deleted_at])).toEqual(
      expect.arrayContaining([
        ['Ações', 'b'],
        ['ACOES', null],
      ]),
    );
  });

  it('looks the folder up by its primary key in the item triggers, so autosaves stay cheap', async () => {
    await migrateTo006();
    const plan = await sql<{ detail: string }>`explain query plan
      select 1 from workspace_folders where id = ${randomUUID()} and project_id = ${randomUUID()} and deleted_at is null`.execute(
      db,
    );
    expect(plan.rows.map((row) => row.detail).join(' ')).toMatch(
      /USING INDEX sqlite_autoindex_workspace_folders_1 \(id=\?\)/u,
    );
  });

  it('runs once: reopening the database migrates nothing', async () => {
    await migrateTo006();
    await db.destroy();
    db = createDatabase(join(directory, 'test.sqlite'));
    expect(await migrateWorkspaceTo(db, 6, directory)).toEqual([]);
    await consistent();
  });
});
