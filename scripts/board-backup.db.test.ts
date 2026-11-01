import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { expect, test } from 'vitest';
import { createAuthService } from '../src/auth/index.js';
import { createDatabase, migrate } from '../src/core/infra/index.js';
import { modules } from '../src/server/modules.js';
import { createWorkspaceService } from '../src/workspace/index.js';
import { seedSample } from './seed-sample.js';
import { snapshot } from './storage.js';

test('restores the columns, labels, links, descriptions and time zone, with the board rules, from a live backup', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'tinyfold-board-backup-'));
  const source = join(directory, 'source.sqlite');
  const backup = join(directory, 'backup.sqlite');
  const restored = join(directory, 'restored.sqlite');
  const db = createDatabase(source);
  try {
    await migrate(db, modules);
    const auth = createAuthService(db);
    await auth.ensureOwner({ name: 'Você', password: 'tinyfold-backup-password' });
    await auth.setTimeZone('America/Sao_Paulo');
    const [tinyfold] = await seedSample(db, { grande: false });
    if (!tinyfold) throw new Error('The sample has no Tinyfold.');
    const workspace = createWorkspaceService(db);
    // A deleted label keeps its links, and the backup keeps both.
    const labels = await workspace.listLabels({});
    const kanban = labels.labels.find((label) => label.name === 'kanban');
    if (!kanban) throw new Error('The sample has no kanban label.');
    await workspace.deleteLabel({ requestId: randomUUID(), id: kanban.id, expectedVersion: kanban.version });
    const columns = await workspace.listColumns({});
    const board = await workspace.projectBoard({ projectId: tinyfold.id });
    const details = await Promise.all(board.tasks.map((task) => workspace.getTask({ id: task.id })));
    const links = new Database(source, { readonly: true });
    const linkRows = links.prepare('SELECT * FROM workspace_task_labels ORDER BY task_id, label_id').all();
    links.close();
    await snapshot(source, backup);

    // Changes after the backup stay out of it.
    await workspace.createColumn({ requestId: randomUUID(), name: 'Depois do backup' });
    await snapshot(backup, restored);
    const restoredDb = createDatabase(restored);
    try {
      expect(await migrate(restoredDb, modules)).toEqual([]);
      const copy = createWorkspaceService(restoredDb);
      expect(await copy.listColumns({})).toEqual(columns);
      expect(columns.columns.map((column) => column.name)).toEqual(['A fazer', 'Em andamento', 'Revisão', 'Concluído']);
      expect((await copy.listLabels({})).labels.map((label) => label.name)).toEqual([
        'backend',
        'compras',
        'editor',
        'fornecedores',
        'mcp',
        'operação',
      ]);
      expect(await copy.projectBoard({ projectId: tinyfold.id })).toEqual(board);
      expect(await Promise.all(board.tasks.map((task) => copy.getTask({ id: task.id })))).toEqual(details);
      expect(details.find((task) => task.title === 'Gerar token pessoal no Perfil')).toMatchObject({
        checklist: { done: 2, total: 5 },
        description: expect.arrayContaining([expect.objectContaining({ type: 'checkListItem' })]),
      });
      expect(await createAuthService(restoredDb).timeZone()).toBe('America/Sao_Paulo');
    } finally {
      await restoredDb.destroy();
    }

    // The links to the deleted label, the unique indexes and the triggers come along in the new file.
    const raw = new Database(restored);
    try {
      expect(raw.prepare('SELECT * FROM workspace_task_labels ORDER BY task_id, label_id').all()).toEqual(linkRows);
      expect(linkRows.some((row) => (row as { label_id: string }).label_id === kanban.id)).toBe(true);
      const now = new Date().toISOString();
      const column = raw.prepare(
        `INSERT INTO workspace_columns (id, name, name_key, position, is_done, version, created_at, updated_at)
         VALUES (?, ?, ?, 9, ?, 1, ?, ?)`,
      );
      expect(() => column.run(randomUUID(), 'Revisao', 'revisao', 0, now, now)).toThrow('UNIQUE constraint failed');
      expect(() => column.run(randomUUID(), 'Outra conclusão', 'outra conclusao', 1, now, now)).toThrow(
        'UNIQUE constraint failed',
      );
      const label = raw.prepare(
        `INSERT INTO workspace_labels (id, name, name_key, color, version, created_at, updated_at)
         VALUES (?, ?, ?, 'blue', 1, ?, ?)`,
      );
      expect(() => label.run(randomUUID(), 'MCP', 'mcp', now, now)).toThrow('UNIQUE constraint failed');
      // The deleted label's name is free again.
      expect(() => label.run(randomUUID(), 'Kanban', 'kanban', now, now)).not.toThrow();
      const done = columns.columns.find((item) => item.isDone);
      const open = board.tasks.find((task) => task.completedAt === null);
      expect(() =>
        raw.prepare('UPDATE workspace_tasks SET column_id = ? WHERE id = ?').run(done?.id, open?.id),
      ).toThrow('workspace_tasks.completed_at must be set exactly in the done column');
      expect(() =>
        raw.prepare('UPDATE workspace_columns SET deleted_at = ? WHERE id = ?').run(now, columns.columns[0]?.id),
      ).toThrow('workspace_columns cannot be deleted with tasks or as the done column');
    } finally {
      raw.close();
    }
  } finally {
    await db.destroy();
    await rm(directory, { recursive: true, force: true });
  }
});
