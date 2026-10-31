import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { coreModule, createDatabase, type Database, migrate } from '@tinyfold/core/infra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DocumentBlock, Project, TaskStatus } from '../domain/models.js';
import { workspaceModule } from '../infra/module.js';
import { createWorkspaceService } from '../infra/service.js';
import { drawingFixture } from '../testing/canvas-scenes.js';
import { testProject } from '../testing/projects.js';

const request = () => ({ requestId: randomUUID() });
const content = (text: string): DocumentBlock[] => [
  { type: 'paragraph', content: [{ type: 'text', text, styles: {} }] },
];

describe('navigation queries', () => {
  let directory: string;
  let db: Database;
  let service: ReturnType<typeof createWorkspaceService>;
  let project: Project;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'tinyfold-navigation-'));
    db = createDatabase(join(directory, 'test.sqlite'));
    await migrate(db, [coreModule, workspaceModule]);
    let now = new Date('2026-10-31T12:00:00Z');
    service = createWorkspaceService(db, () => {
      now = new Date(now.getTime() + 1000);
      return now;
    });
    project = await testProject(service);
  });
  afterEach(async () => {
    await db.destroy();
    await rm(directory, { recursive: true, force: true });
  });
  const newDocument = (title: string, text = '') =>
    service.createDocument({ ...request(), projectId: project.id, title, content: content(text) });
  const newTask = (title: string, status: TaskStatus) =>
    service.createTask({ ...request(), projectId: project.id, title, status });
  const titles = (items: { title: string }[]) => items.map((item) => item.title);

  describe('projectNavigation', () => {
    it('lists pinned items first, then the first unpinned ones, with totals that leave the trash out', async () => {
      const created = [];
      for (const title of ['Gama', 'alfa', 'Ébano', 'Delta', 'beta', 'Zeta', 'Ômega', 'Iota', 'Kappa', 'Lambda'])
        created.push(await newDocument(title));
      const [gama, alfa, , , , zeta] = created;
      await service.pinItem({ type: 'document', id: zeta?.id ?? '' });
      await service.pinItem({ type: 'document', id: gama?.id ?? '' });
      await service.deleteDocument({ ...request(), id: alfa?.id ?? '', expectedVersion: 1 });
      const drawing = await service.createCanvas({ ...request(), projectId: project.id, title: 'Mapa' });
      await service.createDocument({ ...request(), projectId: (await testProject(service, 'Outro')).id });

      const navigation = await service.projectNavigation({ projectId: project.id });
      expect(navigation.documents.total).toBe(9);
      expect(titles(navigation.documents.pinned)).toEqual(['Zeta', 'Gama']);
      expect(titles(navigation.documents.items)).toEqual([
        'Lambda',
        'Kappa',
        'Iota',
        'Ômega',
        'beta',
        'Delta',
        'Ébano',
      ]);
      expect(navigation.documents.pinned[0]).toEqual({
        id: zeta?.id,
        title: 'Zeta',
        updatedAt: zeta?.updatedAt,
        createdAt: zeta?.createdAt,
        pinnedAt: expect.any(String),
      });
      expect(navigation.drawings).toEqual({
        total: 1,
        pinned: [],
        items: [expect.objectContaining({ id: drawing.id, title: 'Mapa', pinnedAt: null })],
      });
      expect(navigation.trashCount).toBe(1);
    });

    it('orders each section by last edit, by title or by creation, up to the limit', async () => {
      for (const title of ['Banco', 'árvore', 'Casa', 'Doc 10', 'Doc 2']) await newDocument(title);
      const first = (await service.listDocuments({ projectId: project.id })).at(-1);
      await service.saveDocument({
        ...request(),
        id: first?.id ?? '',
        expectedVersion: 1,
        title: 'Banco',
        content: [],
      });
      const sorted = async (documentsSort: 'recent' | 'title' | 'created', limit?: number) =>
        titles(
          (await service.projectNavigation({ projectId: project.id, documentsSort, ...(limit ? { limit } : {}) }))
            .documents.items,
        );
      expect(await sorted('recent')).toEqual(['Banco', 'Doc 2', 'Doc 10', 'Casa', 'árvore']);
      expect(await sorted('title')).toEqual(['árvore', 'Banco', 'Casa', 'Doc 10', 'Doc 2']);
      expect(await sorted('created')).toEqual(['Doc 2', 'Doc 10', 'Casa', 'árvore', 'Banco']);
      expect(await sorted('title', 2)).toEqual(['árvore', 'Banco']);
      expect(() => service.projectNavigation({ projectId: project.id, limit: 21 })).toThrow();
    });

    it('counts open tasks and every type in the trash, for archived projects too', async () => {
      await newTask('A fazer', 'todo');
      await newTask('Andando', 'doing');
      await newTask('Pronta', 'done');
      const removed = await newTask('Removida', 'todo');
      await service.deleteTask({ ...request(), id: removed.task.id, expectedVersion: 1 });
      const canvas = await service.createCanvas({ ...request(), projectId: project.id });
      await service.deleteCanvas({ ...request(), id: canvas.id, expectedVersion: 1 });
      await service.updateProject({ ...request(), id: project.id, expectedVersion: 1, archived: true });
      expect(await service.projectNavigation({ projectId: project.id })).toMatchObject({ openTasks: 2, trashCount: 2 });
      await expect(service.projectNavigation({ projectId: randomUUID() })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('projectOverview', () => {
    it('shows the tasks in progress in board order and counts what is left out per column', async () => {
      for (let index = 0; index < 8; index += 1) await newTask(`Em curso ${index}`, 'doing');
      for (let index = 0; index < 3; index += 1) await newTask(`A fazer ${index}`, 'todo');
      await newTask('Concluída', 'done');
      const document = await newDocument('Origem', 'Revisar o plano');
      await service.createTask({
        ...request(),
        title: 'Revisar',
        status: 'doing',
        source: { documentId: document.id, excerpt: 'Revisar' },
      });
      const overview = await service.projectOverview({ projectId: project.id });
      expect(overview.openTasks).toBe(12);
      expect(titles(overview.now)).toEqual([
        'Em curso 0',
        'Em curso 1',
        'Em curso 2',
        'Em curso 3',
        'Em curso 4',
        'Em curso 5',
      ]);
      expect(overview.now[0]).toMatchObject({ status: 'doing', projectId: project.id, source: null });
      expect(overview.rest).toEqual([
        { status: 'todo', count: 3 },
        { status: 'doing', count: 3 },
      ]);
    });

    it('lists the documents and drawings edited last, with a one-line excerpt', async () => {
      const notes = await newDocument('Notas', `Primeira linha\nsegunda linha ${'texto '.repeat(200)}`);
      for (let index = 0; index < 4; index += 1) await newDocument(`Documento ${index}`);
      const drawing = await service.createCanvas({
        ...request(),
        projectId: project.id,
        title: 'Fluxo',
        scene: drawingFixture(),
      });
      const trashed = await newDocument('Na lixeira');
      await service.deleteDocument({ ...request(), id: trashed.id, expectedVersion: 1 });
      await service.saveDocument({
        ...request(),
        id: notes.id,
        expectedVersion: 1,
        title: 'Notas',
        content: content(`Primeira linha\nsegunda linha ${'texto '.repeat(200)}`),
      });

      const overview = await service.projectOverview({ projectId: project.id });
      expect(overview.recent.map((item) => [item.type, item.title])).toEqual([
        ['document', 'Notas'],
        ['drawing', 'Fluxo'],
        ['document', 'Documento 3'],
        ['document', 'Documento 2'],
        ['document', 'Documento 1'],
      ]);
      const [last] = overview.recent;
      expect(last?.excerpt.startsWith('Primeira linha segunda linha texto')).toBe(true);
      expect(last?.excerpt.endsWith('…')).toBe(true);
      expect(Array.from(last?.excerpt ?? '').length).toBeLessThanOrEqual(240);
      expect(overview.recent[1]).toEqual({
        type: 'drawing',
        id: drawing.id,
        title: 'Fluxo',
        updatedAt: drawing.updatedAt,
        excerpt: 'Ideia Fluxo de ação',
      });
      expect(overview.lastEdited).toEqual({
        type: 'document',
        id: notes.id,
        title: 'Notas',
        updatedAt: last?.updatedAt,
      });
    });

    it('answers an empty project with nothing to show', async () => {
      expect(await service.projectOverview({ projectId: project.id })).toEqual({
        openTasks: 0,
        now: [],
        rest: [],
        recent: [],
        lastEdited: null,
      });
      await expect(service.projectOverview({ projectId: randomUUID() })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });
});
