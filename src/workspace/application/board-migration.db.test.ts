import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { coreModule, createDatabase, type Database, migrate } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_COLUMN_IDS } from '../domain/columns.js';
import { searchText } from '../domain/search-text.js';
import { workspaceModule } from '../infra/module.js';
import { createWorkspaceService } from '../infra/service.js';
import { loadStage09Fixture, migrateWorkspaceTo } from '../testing/legacy-workspace.js';

let directory: string;
let db: Database;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'tinyfold-board-migration-'));
  db = createDatabase(join(directory, 'test.sqlite'));
});
afterEach(async () => {
  await db.destroy();
  await rm(directory, { recursive: true, force: true });
});

const rows = async <T = Record<string, unknown>>(query: string) => (await sql.raw<T>(query).execute(db)).rows;
const revision = async () => (await rows<{ board_revision: number }>('select board_revision from workspace_state'))[0];
const consistent = async () => {
  expect(await rows('pragma integrity_check')).toEqual([{ integrity_check: 'ok' }]);
  expect(await rows('pragma foreign_key_check')).toEqual([]);
  expect(await rows('pragma foreign_keys')).toEqual([{ foreign_keys: 1 }]);
};
const migrateTo007 = async () => {
  expect(await migrate(db, [coreModule, workspaceModule])).toEqual([
    { module: 'workspace', version: 7, name: 'board' },
  ]);
  await consistent();
};
const columnOf = { todo: INITIAL_COLUMN_IDS.todo, doing: INITIAL_COLUMN_IDS.doing, done: INITIAL_COLUMN_IDS.done };
const untouched = [
  'workspace_projects',
  'workspace_documents',
  'workspace_canvases',
  'workspace_canvas_previews',
  'workspace_folders',
  'workspace_task_sources',
  'core_mutations',
];

interface OldTask {
  id: string;
  project_id: string;
  title: string;
  status: 'todo' | 'doing' | 'done';
  position: number;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

describe('migration 007', () => {
  it('adds the three initial columns to an empty database at 006, and raises the revision once', async () => {
    await migrateWorkspaceTo(db, 6, directory);
    await migrateTo007();
    expect(
      await rows('select id, name, name_key, position, is_done, version, deleted_at from workspace_columns order by 4'),
    ).toEqual([
      {
        id: columnOf.todo,
        name: 'A fazer',
        name_key: 'a fazer',
        position: 0,
        is_done: 0,
        version: 1,
        deleted_at: null,
      },
      {
        id: columnOf.doing,
        name: 'Em andamento',
        name_key: 'em andamento',
        position: 1,
        is_done: 0,
        version: 1,
        deleted_at: null,
      },
      {
        id: columnOf.done,
        name: 'Concluído',
        name_key: 'concluido',
        position: 2,
        is_done: 1,
        version: 1,
        deleted_at: null,
      },
    ]);
    expect(await revision()).toEqual({ board_revision: 1 });
    expect(await rows('select * from workspace_labels')).toEqual([]);
  });

  for (const fixture of ['sample', 'grande'] as const)
    it(`places every task of the stage 09 ${fixture} database in its column, and keeps everything else`, async () => {
      await loadStage09Fixture(db, fixture);
      const before = await rows<OldTask>('select * from workspace_tasks order by id');
      const kept = Object.fromEntries(
        await Promise.all(untouched.map(async (table) => [table, await rows(`select * from ${table} order by 1`)])),
      );
      const [{ board_revision: oldRevision } = { board_revision: 0 }] = await rows<{ board_revision: number }>(
        'select board_revision from workspace_state',
      );
      expect(before.map((task) => task.status).sort()).toContain('done');
      await migrateTo007();

      expect(await rows('select * from workspace_tasks order by id')).toEqual(
        before.map(({ status, ...task }) => ({
          ...task,
          column_id: columnOf[status],
          due_on: null,
          completed_at: status === 'done' ? task.updated_at : null,
          description: '[]',
          description_plain_text: '',
          search_text: searchText(`${task.title}\n`),
          checklist_done: 0,
          checklist_total: 0,
          text_version: 1,
        })),
      );
      for (const table of untouched) expect(await rows(`select * from ${table} order by 1`)).toEqual(kept[table]);
      expect(await revision()).toEqual({ board_revision: oldRevision + 1 });
      // A second start applies nothing.
      await db.destroy();
      db = createDatabase(join(directory, 'test.sqlite'));
      expect(await migrate(db, [coreModule, workspaceModule])).toEqual([]);
      await consistent();
    });

  it('keeps the sources, answers a stored createTask again and finds accented titles by their plain form', async () => {
    await loadStage09Fixture(db, 'sample');
    const [stored] = await rows<{ request_id: string; response: string }>(
      `select request_id, response from core_mutations where operation = 'workspace.createTask'
       and json_extract(response, '$.id') = (select id from workspace_tasks where title = 'Renovar domínio')`,
    );
    const [geral] = await rows<{ id: string }>("select id from workspace_projects where name = 'Geral'");
    await migrateTo007();
    if (!stored || !geral) throw new Error('The sample database changed.');
    const service = createWorkspaceService(db);
    // The same request, as the stage 09 seed sent it, answers what was recorded then.
    const replay = await service.createTask({
      requestId: stored.request_id,
      projectId: geral.id,
      title: 'Renovar domínio',
      status: 'todo',
    });
    expect(replay).toEqual(JSON.parse(stored.response));
    expect(await rows("select count(*) as count from workspace_tasks where title = 'Renovar domínio'")).toEqual([
      { count: 1 },
    ]);
    expect(await rows("select title from workspace_tasks where instr(search_text, 'dialogo') > 0")).toEqual([
      { title: 'Corrigir foco ao fechar diálogo' },
    ]);
    const tasks = (await service.listTasks({})).tasks;
    expect(tasks.find((task) => task.source)?.source).toMatchObject({
      documentTitle: 'MCP somente leitura',
      excerpt: 'Gerar token pessoal no Perfil',
      available: true,
    });
    expect(tasks.find((task) => task.title === 'Corrigir foco ao fechar diálogo')).toMatchObject({
      columnId: columnOf.done,
      status: 'done',
      completedAt: expect.any(String),
      textVersion: 1,
      labelIds: [],
      checklist: null,
    });
  });

  it('upgrades a database with an old orphan left by manual SQL, warning about it instead of refusing', async () => {
    // The orphan-project base of the stage 08 and 09 reviews: a document whose project was deleted
    // with the keys off. Stage 09 runs on it, and the upgrade must not stop the server.
    await loadStage09Fixture(db, 'sample');
    const [site] = await rows<{ id: string }>("select id from workspace_projects where name = 'Site pessoal 2024'");
    await sql`pragma foreign_keys = off`.execute(db);
    await sql`delete from workspace_projects where id = ${site?.id}`.execute(db);
    await sql`pragma foreign_keys = on`.execute(db);
    const orphans = await rows<{ table: string; rowid: number }>('pragma foreign_key_check');
    expect(orphans.map((row) => row.table)).toEqual(['workspace_documents']);
    const warnings: string[] = [];
    expect(await migrate(db, [coreModule, workspaceModule], { warn: (message) => warnings.push(message) })).toEqual([
      { module: 'workspace', version: 7, name: 'board' },
    ]);
    expect(warnings).toEqual([
      'Foreign key violations from before the migrations, left as they were (1): ' +
        `workspace_documents row ${orphans[0]?.rowid} -> workspace_projects. ` +
        'Run "pragma foreign_key_check" and repair them.',
    ]);
    expect(await rows('pragma foreign_key_check')).toEqual(orphans);
    expect(await rows('pragma foreign_keys')).toEqual([{ foreign_keys: 1 }]);
    expect(await rows('select count(*) as count from workspace_task_sources')).toEqual([{ count: 1 }]);
  });

  describe('refuses through SQL', () => {
    const now = '2026-11-01T12:00:00.000Z';
    const column = (id: string, name: string, extra: { isDone?: boolean; deletedAt?: string | null } = {}) =>
      sql`insert into workspace_columns (id, name, name_key, position, is_done, version, created_at, updated_at, deleted_at)
        values (${id}, ${name}, ${searchText(name)}, 9, ${extra.isDone ? 1 : 0}, 1, ${now}, ${now}, ${extra.deletedAt ?? null})`.execute(
        db,
      );
    const taskIn = async (status: 'todo' | 'done') =>
      (await rows<{ id: string }>(`select id from workspace_tasks where column_id = '${columnOf[status]}' limit 1`))[0]
        ?.id ?? '';

    beforeEach(async () => {
      await loadStage09Fixture(db, 'sample');
      await migrateTo007();
    });

    it('a task in a missing or deleted column, and a completion out of the done column', async () => {
      const deleted = randomUUID();
      await column(deleted, 'Antiga', { deletedAt: now });
      const [todo, done] = [await taskIn('todo'), await taskIn('done')];
      const onlyActive = 'workspace_tasks.column_id must be an active column';
      await expect(
        sql`update workspace_tasks set column_id = ${deleted} where id = ${todo}`.execute(db),
      ).rejects.toThrow(onlyActive);
      await expect(
        sql`update workspace_tasks set column_id = ${randomUUID()} where id = ${todo}`.execute(db),
      ).rejects.toThrow(onlyActive);
      await expect(
        sql`insert into workspace_tasks (id, project_id, column_id, title, position, search_text, version, text_version, created_at, updated_at)
          select ${randomUUID()}, project_id, ${deleted}, 'x', 0, 'x', 1, 1, ${now}, ${now} from workspace_tasks limit 1`.execute(
          db,
        ),
      ).rejects.toThrow(onlyActive);
      const completion = 'workspace_tasks.completed_at must be set exactly in the done column';
      await expect(
        sql`update workspace_tasks set completed_at = ${now} where id = ${todo}`.execute(db),
      ).rejects.toThrow(completion);
      await expect(sql`update workspace_tasks set completed_at = null where id = ${done}`.execute(db)).rejects.toThrow(
        completion,
      );
      await expect(
        sql`update workspace_tasks set column_id = ${columnOf.done} where id = ${todo}`.execute(db),
      ).rejects.toThrow(completion);
      await sql`update workspace_tasks set column_id = ${columnOf.done}, completed_at = ${now} where id = ${todo}`.execute(
        db,
      );
      await expect(sql`update workspace_tasks set project_id = null where id = ${todo}`.execute(db)).rejects.toThrow(
        'NOT NULL constraint failed: workspace_tasks.project_id',
      );
    });

    it('deleting the done column or one with tasks, a second done column and repeated names', async () => {
      const refused = 'workspace_columns cannot be deleted with tasks or as the done column';
      await expect(
        sql`update workspace_columns set deleted_at = ${now} where id = ${columnOf.done}`.execute(db),
      ).rejects.toThrow(refused);
      await expect(
        sql`update workspace_columns set deleted_at = ${now} where id = ${columnOf.todo}`.execute(db),
      ).rejects.toThrow(refused);
      // A trashed task keeps its column too.
      const trashedOnly = randomUUID();
      await column(trashedOnly, 'Só lixeira');
      await sql`update workspace_tasks set column_id = ${trashedOnly} where deleted_at is not null`.execute(db);
      await expect(
        sql`update workspace_columns set deleted_at = ${now} where id = ${trashedOnly}`.execute(db),
      ).rejects.toThrow(refused);
      const empty = randomUUID();
      await column(empty, 'Vazia');
      await sql`update workspace_columns set deleted_at = ${now} where id = ${empty}`.execute(db);

      await expect(column(randomUUID(), 'Outra conclusão', { isDone: true })).rejects.toThrow(
        'UNIQUE constraint failed',
      );
      const oldDone = randomUUID();
      await column(oldDone, 'Concluído antes', { isDone: true, deletedAt: now });
      await expect(
        sql`update workspace_columns set deleted_at = null where id = ${oldDone}`.execute(db),
      ).rejects.toThrow('workspace_columns can have only one done column');
      await expect(column(randomUUID(), 'A FAZER')).rejects.toThrow('UNIQUE constraint failed');
      const label = (name: string) =>
        sql`insert into workspace_labels (id, name, name_key, color, version, created_at, updated_at)
          values (${randomUUID()}, ${name}, ${searchText(name)}, 'blue', 1, ${now}, ${now})`.execute(db);
      await label('mcp');
      await expect(label('MCP')).rejects.toThrow('UNIQUE constraint failed');
      await expect(
        sql`insert into workspace_labels (id, name, name_key, color, version, created_at, updated_at)
          values (${randomUUID()}, 'verde', 'verde', 'green', 1, ${now}, ${now})`.execute(db),
      ).rejects.toThrow('CHECK constraint failed');
    });

    it('INSERT OR REPLACE of a folder, a column or a label something points at', async () => {
      const [folder] = await rows<{ id: string; project_id: string }>(
        'select id, project_id from workspace_folders where id in (select folder_id from workspace_documents) limit 1',
      );
      const [other] = await rows<{ id: string }>(
        `select id from workspace_projects where id <> '${folder?.project_id}' limit 1`,
      );
      await expect(
        sql`insert or replace into workspace_folders (id, project_id, name, name_key, position, version, created_at, updated_at, deleted_at)
          values (${folder?.id}, ${other?.id}, 'Trocada', 'trocada', 0, 1, ${now}, ${now}, ${now})`.execute(db),
      ).rejects.toThrow('workspace_folders.id is in use');
      await expect(
        sql`insert or replace into workspace_columns (id, name, name_key, position, is_done, version, created_at, updated_at, deleted_at)
          values (${columnOf.todo}, 'Trocada', 'trocada', 0, 0, 1, ${now}, ${now}, ${now})`.execute(db),
      ).rejects.toThrow('workspace_columns.id is in use');
      const label = randomUUID();
      await sql`insert into workspace_labels (id, name, name_key, color, version, created_at, updated_at)
        values (${label}, 'mcp', 'mcp', 'blue', 1, ${now}, ${now})`.execute(db);
      await sql`insert into workspace_task_labels (task_id, label_id) select id, ${label} from workspace_tasks limit 1`.execute(
        db,
      );
      await expect(
        sql`insert or replace into workspace_labels (id, name, name_key, color, version, created_at, updated_at, deleted_at)
          values (${label}, 'outra', 'outra', 'lime', 1, ${now}, ${now}, ${now})`.execute(db),
      ).rejects.toThrow('workspace_labels.id is in use');
      await expect(sql`delete from workspace_labels where id = ${label}`.execute(db)).rejects.toThrow(
        'FOREIGN KEY constraint failed',
      );
      await consistent();
    });

    it('nothing a task trigger looks up goes past the primary key of the columns', async () => {
      const plan = await sql<{ detail: string }>`explain query plan
        select 1 from workspace_columns where id = ${randomUUID()} and deleted_at is null`.execute(db);
      expect(plan.rows.map((row) => row.detail).join(' ')).toMatch(
        /USING INDEX sqlite_autoindex_workspace_columns_1 \(id=\?\)/u,
      );
    });
  });
});
