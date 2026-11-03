import { randomUUID } from 'node:crypto';
import { coreModule, type Database, migrate } from '@tinyfold/core/infra';
import { useTempDatabase } from '@tinyfold/core/testing';
import { sql } from 'kysely';
import { beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_COLUMN_IDS } from '../domain/columns.js';
import { searchText } from '../domain/search-text.js';
import { workspaceModule } from '../infra/module.js';
import { createWorkspaceService } from '../infra/service.js';
import { loadStage09Fixture, migrateWorkspaceTo } from '../testing/legacy-workspace.js';

const database = useTempDatabase([]);
let directory: string;
let db: Database;
beforeEach(async () => {
  directory = database.folder;
  db = database.db;
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
      db = database.open('test.sqlite');
      expect(await migrate(db, [coreModule, workspaceModule])).toEqual([]);
      await consistent();
    });

  it('keeps the sources, refuses a stored createTask replayed with or without its status and finds accented titles by their plain form', async () => {
    await loadStage09Fixture(db, 'sample');
    const [stored] = await rows<{ request_id: string; response: string }>(
      `select request_id, response from core_mutations where operation = 'workspace.createTask'
       and json_extract(response, '$.id') = (select id from workspace_tasks where title = 'Renovar domínio')`,
    );
    const [geral] = await rows<{ id: string }>("select id from workspace_projects where name = 'Geral'");
    await migrateTo007();
    if (!stored || !geral) throw new Error('The sample database changed.');
    const service = createWorkspaceService(db);
    // The same request, as the stage 09 seed sent it: the task writes refuse its status, a key they no
    // longer know. Sent without it, its data no longer match what was recorded. Neither makes a second task.
    const replay = { requestId: stored.request_id, projectId: geral.id, title: 'Renovar domínio' };
    expect(() => service.createTask({ ...replay, status: 'todo' } as Parameters<typeof service.createTask>[0])).toThrow(
      'Unrecognized key',
    );
    await expect(service.createTask(replay)).rejects.toMatchObject({ code: 'REQUEST_REUSED' });
    expect(JSON.parse(stored.response)).toMatchObject({ id: expect.any(String), revision: expect.any(Number) });
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
        'workspace_columns can have only one done column',
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

    it('a change of is_done that leaves no done column, a done column in the trash, and keeps completions in sync', async () => {
      const doneColumns = async () =>
        (await rows<{ id: string }>('select id from workspace_columns where is_done = 1 and deleted_at is null')).map(
          (row) => row.id,
        );
      const wrongCompletions = async () =>
        (
          await rows<{ count: number }>(`select count(*) as count from workspace_tasks t
            join workspace_columns c on c.id = t.column_id where c.is_done is not (t.completed_at is not null)`)
        )[0]?.count;
      const completed = async (columnId: string) =>
        (
          await rows<{ count: number }>(
            `select count(*) as count from workspace_tasks where column_id = '${columnId}' and completed_at is not null`,
          )
        )[0]?.count;
      const before = await completed(columnOf.done);
      expect(before).toBeGreaterThan(0);

      // The reviewer's attacks: clearing the done column, and swapping is_done in one statement. The
      // swap is refused when its first row clears the done column, and is a handover otherwise.
      const kept = 'workspace_columns must keep a done column: make another column the done one';
      await expect(
        sql`update workspace_columns set is_done = 0 where id = ${columnOf.done}`.execute(db),
      ).rejects.toThrow(kept);
      const swap = await sql`update workspace_columns set is_done = case when id = ${columnOf.doing} then 1 else 0 end
          where id in (${columnOf.done}, ${columnOf.doing})`
        .execute(db)
        .then(
          () => 'applied',
          (error: Error) => error.message,
        );
      expect(['applied', kept]).toContain(swap);
      expect([(await doneColumns()).length, await wrongCompletions()]).toEqual([1, 0]);
      await sql`update workspace_columns set is_done = 1 where id = ${columnOf.done}`.execute(db);
      expect([await doneColumns(), await wrongCompletions()]).toEqual([[columnOf.done], 0]);
      const trashed = randomUUID();
      await column(trashed, 'Na lixeira', { deletedAt: now });
      await expect(sql`update workspace_columns set is_done = 1 where id = ${trashed}`.execute(db)).rejects.toThrow(
        'workspace_columns: only an active column can be the done one',
      );

      // Making a column the done one hands the role over, with the completions of both columns.
      const doing = await rows<{ id: string }>(`select id from workspace_tasks where column_id = '${columnOf.doing}'`);
      expect(doing.length).toBeGreaterThan(0);
      await sql`update workspace_columns set is_done = 1, updated_at = ${now} where id = ${columnOf.doing}`.execute(db);
      expect([await doneColumns(), await wrongCompletions()]).toEqual([[columnOf.doing], 0]);
      expect([await completed(columnOf.done), await completed(columnOf.doing)]).toEqual([0, doing.length]);
      expect(
        await rows(`select distinct completed_at from workspace_tasks where column_id = '${columnOf.doing}'`),
      ).toEqual([{ completed_at: now }]);
      // Without a new update date, the completions take the current time.
      await sql`update workspace_columns set is_done = 1 where id = ${columnOf.done}`.execute(db);
      expect([await doneColumns(), await wrongCompletions(), await completed(columnOf.done)]).toEqual([
        [columnOf.done],
        0,
        before,
      ]);
      expect(
        (
          await rows<{ at: string }>(
            `select min(completed_at) as at from workspace_tasks where column_id = '${columnOf.done}'`,
          )
        )[0]?.at,
      ).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u);
      await consistent();
    });

    it('DELETE or REPLACE of an empty done column, and any insert of an id that exists', async () => {
      const empty = randomUUID();
      await column(empty, 'Vazia');
      await sql`update workspace_columns set is_done = 1, updated_at = ${now} where id = ${empty}`.execute(db);
      const doneColumns = async () =>
        (await rows<{ id: string }>('select id from workspace_columns where is_done = 1 and deleted_at is null')).map(
          (row) => row.id,
        );
      expect(await doneColumns()).toEqual([empty]);
      // The reviewer's attacks on a done column no task holds.
      await expect(sql`delete from workspace_columns where id = ${empty}`.execute(db)).rejects.toThrow(
        'workspace_columns cannot delete the done column',
      );
      for (const [isDone, deletedAt] of [
        [0, null],
        [1, now],
      ] as const)
        await expect(
          sql`insert or replace into workspace_columns (id, name, name_key, position, is_done, version, created_at, updated_at, deleted_at)
            values (${empty}, 'Vazia', 'vazia', 9, ${isDone}, 1, ${now}, ${now}, ${deletedAt})`.execute(db),
        ).rejects.toThrow('workspace_columns.id is in use');
      await expect(
        sql`insert into workspace_columns (id, name, name_key, position, is_done, version, created_at, updated_at)
          values (${empty}, 'Outra', 'outra', 9, 0, 1, ${now}, ${now})
          on conflict (id) do update set is_done = 0`.execute(db),
      ).rejects.toThrow('workspace_columns.id is in use');
      expect(await doneColumns()).toEqual([empty]);
      // An empty open column can still go, and a folder or label nothing points at cannot be replaced.
      const loose = randomUUID();
      await column(loose, 'Solta');
      await sql`delete from workspace_columns where id = ${loose}`.execute(db);
      const [folder] = await rows<{ id: string; project_id: string }>(
        `select id, project_id from workspace_folders
         where id not in (select folder_id from workspace_documents where folder_id is not null)
           and id not in (select folder_id from workspace_canvases where folder_id is not null) limit 1`,
      );
      if (folder)
        await expect(
          sql`insert or replace into workspace_folders (id, project_id, name, name_key, position, version, created_at, updated_at)
            values (${folder.id}, ${folder.project_id}, 'Trocada', 'trocada', 0, 1, ${now}, ${now})`.execute(db),
        ).rejects.toThrow('workspace_folders.id is in use');
      const label = randomUUID();
      await sql`insert into workspace_labels (id, name, name_key, color, version, created_at, updated_at)
        values (${label}, 'solta', 'solta', 'blue', 1, ${now}, ${now})`.execute(db);
      await expect(
        sql`insert or replace into workspace_labels (id, name, name_key, color, version, created_at, updated_at, deleted_at)
          values (${label}, 'outra', 'outra', 'lime', 1, ${now}, ${now}, ${now})`.execute(db),
      ).rejects.toThrow('workspace_labels.id is in use');
      await consistent();
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
