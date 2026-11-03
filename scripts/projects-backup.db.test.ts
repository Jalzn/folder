import { randomUUID } from 'node:crypto';
import { expect, test } from 'vitest';
import { migrate } from '../src/core/infra/index.js';
import { modules } from '../src/server/modules.js';
import { createWorkspaceService } from '../src/server/workspace/index.js';
import { backupRoundTrip } from './testing/backup-round-trip.js';

const request = () => ({ requestId: randomUUID() });
const paragraph = (text: string) => [{ type: 'paragraph', content: [{ type: 'text', text, styles: {} }] }];

test('restores project colours and order, pins and task sources with their titles from a live backup', async () => {
  const roundTrip = await backupRoundTrip('tinyfold-projects-backup-');
  const { db } = roundTrip;
  try {
    await migrate(db, modules);
    const workspace = createWorkspaceService(db);
    const tinyfold = await workspace.createProject({ ...request(), name: 'Tinyfold' });
    const reforma = await workspace.createProject({ ...request(), name: 'Reforma', color: 'green' });
    await workspace.moveProject({ ...request(), id: reforma.id, beforeProjectId: tinyfold.id });
    const embedded = await workspace.createCanvas({ ...request(), projectId: tinyfold.id, title: 'Navegação' });
    const pinned = await workspace.createDocument({ ...request(), projectId: tinyfold.id, title: 'Visão' });
    const { pinnedAt } = await workspace.pinItem({ type: 'document', id: pinned.id });
    const draft = await workspace.createDocument({
      ...request(),
      projectId: tinyfold.id,
      title: 'Rascunho',
      content: paragraph('Gerar token pessoal'),
    });
    const task = await workspace.createTask({
      ...request(),
      title: 'Gerar token',
      source: { documentId: draft.id, excerpt: 'Gerar token pessoal' },
    });
    // A document with embeds keeps its blocks: they are its JSON.
    const withEmbeds = await workspace.createDocument({
      ...request(),
      projectId: tinyfold.id,
      title: 'Com incorporados',
      content: [
        { id: 'e1', type: 'taskEmbed', props: { taskId: task.id }, children: [] },
        { id: 'e2', type: 'drawingEmbed', props: { canvasId: embedded.id }, children: [] },
      ],
    });
    const embedding = await workspace.getDocument({ id: withEmbeds.id });
    const trashed = await workspace.deleteDocument({ ...request(), id: draft.id, expectedVersion: 1 });
    await workspace.purgeDocument({ ...request(), id: draft.id, expectedVersion: trashed.version });
    const projects = await workspace.listProjects();
    const tasks = await workspace.listTasks();
    await roundTrip.backup();

    await workspace.unpinItem({ type: 'document', id: pinned.id });
    await workspace.moveProject({ ...request(), id: tinyfold.id, beforeProjectId: reforma.id });
    const restoredDb = await roundTrip.restore();
    try {
      expect(await migrate(restoredDb, modules)).toEqual([]);
      const copy = createWorkspaceService(restoredDb);
      expect(await copy.listProjects()).toEqual(projects);
      expect(projects.map((project) => [project.name, project.color, project.position])).toEqual([
        ['Reforma', 'green', 0],
        ['Tinyfold', 'violet', 1],
      ]);
      expect((await copy.getDocument({ id: pinned.id })).pinnedAt).toBe(pinnedAt);
      expect(await copy.getDocument({ id: withEmbeds.id })).toEqual(embedding);
      expect(await copy.resolveEmbeds({ taskIds: [task.id], canvasIds: [embedded.id] })).toMatchObject({
        tasks: [{ state: 'live', id: task.id }],
        drawings: [{ state: 'live', id: embedded.id }],
      });
      expect(await copy.listTasks()).toEqual(tasks);
      expect(tasks.tasks[0]).toMatchObject({
        id: task.id,
        source: { documentId: null, documentTitle: 'Rascunho', excerpt: 'Gerar token pessoal', available: false },
      });
      expect((await workspace.getDocument({ id: pinned.id })).pinnedAt).toBeNull();
    } finally {
      await restoredDb.destroy();
    }
  } finally {
    await roundTrip.dispose();
  }
});
