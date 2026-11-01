import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { coreModule, createDatabase, type Database, migrate } from '@tinyfold/core/infra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_COLUMN_IDS } from '../domain/columns.js';
import type { DocumentBlock, Project, TaskStatus } from '../domain/models.js';
import { workspaceModule } from '../infra/module.js';
import { createWorkspaceService } from '../infra/service.js';
import { drawingFixture } from '../testing/canvas-scenes.js';
import { testFolder } from '../testing/folders.js';
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
      expect(Object.keys(navigation)).toEqual(['tree', 'openTasks', 'overdueTasks', 'trashCount']);
      const { tree } = navigation;
      expect(tree.total).toBe(10);
      expect(titles(tree.pinned)).toEqual(['Zeta', 'Gama']);
      // Documents and drawings together, by last edit: the drawing came last.
      expect(tree.loose.total).toBe(8);
      expect(titles(tree.loose.items)).toEqual(['Mapa', 'Lambda', 'Kappa', 'Iota', 'Ômega', 'beta', 'Delta', 'Ébano']);
      expect(tree.loose.items[0]).toEqual(
        expect.objectContaining({ type: 'drawing', id: drawing.id, folderId: null, pinnedAt: null }),
      );
      expect(tree.pinned[0]).toEqual({
        type: 'document',
        folderId: null,
        id: zeta?.id,
        title: 'Zeta',
        updatedAt: zeta?.updatedAt,
        // A new document's first edit is its creation.
        createdAt: zeta?.updatedAt,
        pinnedAt: expect.any(String),
      });
      expect(navigation.trashCount).toBe(1);
    });

    it('orders the loose items by last edit, by title or by creation, up to the limit', async () => {
      for (const title of ['Banco', 'árvore', 'Casa', 'Doc 10', 'Doc 2']) await newDocument(title);
      const first = (await service.listDocuments({ projectId: project.id })).at(-1);
      await service.saveDocument({
        ...request(),
        id: first?.id ?? '',
        expectedVersion: 1,
        title: 'Banco',
        content: [],
      });
      const sorted = async (sort: 'recent' | 'title' | 'created', limit?: number) =>
        titles(
          (await service.projectNavigation({ projectId: project.id, sort, ...(limit ? { limit } : {}) })).tree.loose
            .items,
        );
      expect(await sorted('recent')).toEqual(['Banco', 'Doc 2', 'Doc 10', 'Casa', 'árvore']);
      expect(await sorted('title')).toEqual(['árvore', 'Banco', 'Casa', 'Doc 10', 'Doc 2']);
      expect(await sorted('created')).toEqual(['Doc 2', 'Doc 10', 'Casa', 'árvore', 'Banco']);
      expect(await sorted('title', 2)).toEqual(['árvore', 'Banco']);
      expect(() => service.projectNavigation({ projectId: project.id, limit: 21 })).toThrow();
      // An old client's per-type orders are dropped, as any unknown key: the tree keeps its own order.
      const old = { projectId: project.id, documentsSort: 'title', drawingsSort: 'title' } as { projectId: string };
      expect(titles((await service.projectNavigation(old)).tree.loose.items)).toEqual(await sorted('recent'));
    });

    it('builds the items tree: root pins, folders in order with their first children, then loose items', async () => {
      const [arquitetura, mcp] = [
        await testFolder(service, project.id, 'Arquitetura'),
        await testFolder(service, project.id, 'MCP'),
      ];
      const gone = await testFolder(service, project.id, 'Excluída');
      const file = (title: string, folderId?: string) =>
        service.createDocument({ ...request(), projectId: project.id, title, ...(folderId ? { folderId } : {}) });
      const visao = await file('Visão do produto');
      await service.pinItem({ type: 'document', id: visao.id });
      await file('MCP somente leitura', mcp.id);
      for (const title of ['Notas', 'Camadas', 'Banco']) await file(title, arquitetura.id);
      const fluxo = await service.createCanvas({
        ...request(),
        projectId: project.id,
        title: 'Fluxo do autosave',
        folderId: arquitetura.id,
      });
      await service.pinItem({ type: 'drawing', id: fluxo.id });
      await file('Navegação');
      const trashed = await file('Na lixeira', mcp.id);
      await service.deleteDocument({ ...request(), id: trashed.id, expectedVersion: 1 });
      await service.deleteFolder({ ...request(), id: gone.id, expectedVersion: 1, withItems: false });

      const { tree } = await service.projectNavigation({ projectId: project.id, sort: 'title', limit: 2 });
      expect(tree.total).toBe(7);
      expect(titles(tree.pinned)).toEqual(['Visão do produto']);
      expect(tree.folders.map((folder) => [folder.name, folder.position, folder.total, titles(folder.items)])).toEqual([
        ['MCP', 0, 1, ['MCP somente leitura']],
        ['Arquitetura', 1, 4, ['Fluxo do autosave', 'Banco']],
      ]);
      expect(tree.folders[1]?.items[0]).toMatchObject({ type: 'drawing', folderId: arquitetura.id });
      expect(tree.loose).toEqual({
        total: 1,
        items: [expect.objectContaining({ title: 'Navegação', folderId: null })],
      });
    });

    it('counts open tasks and every type in the trash, for archived projects too', async () => {
      await newTask('A fazer', 'todo');
      await newTask('Andando', 'doing');
      await newTask('Pronta', 'done');
      const removed = await newTask('Removida', 'todo');
      await service.deleteTask({ ...request(), id: removed.id, expectedVersion: 1 });
      const canvas = await service.createCanvas({ ...request(), projectId: project.id });
      await service.deleteCanvas({ ...request(), id: canvas.id, expectedVersion: 1 });
      await service.updateProject({ ...request(), id: project.id, expectedVersion: 1, archived: true });
      expect(await service.projectNavigation({ projectId: project.id })).toMatchObject({ openTasks: 2, trashCount: 2 });
      await expect(service.projectNavigation({ projectId: randomUUID() })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('projectOverview', () => {
    it('shows Agora: the tasks in progress in board order, and counts what is left out per column', async () => {
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
      // Until B6 each column also reads as its stage 09 status.
      expect(overview.rest).toEqual([
        { columnId: INITIAL_COLUMN_IDS.todo, count: 3, withoutDue: 3, only: null, status: 'todo' },
        { columnId: INITIAL_COLUMN_IDS.doing, count: 3, withoutDue: 3, only: null, status: 'doing' },
      ]);
      expect(overview).toMatchObject({
        overdueTasks: 0,
        doneTotal: 1,
        done: [expect.objectContaining({ title: 'Concluída' })],
      });
    });

    it("counts overdue tasks in the owner's time zone and puts them first in Agora, with the latest done", async () => {
      // 01:00 UTC on Nov 1st: still Oct 31st in São Paulo.
      const clock = { now: new Date('2026-11-01T01:00:00Z') };
      let zone = 'UTC';
      const zoned = createWorkspaceService(
        db,
        () => clock.now,
        async () => zone,
      );
      const task = (title: string, columnId: string, dueOn: string | null = null, projectId = project.id) =>
        zoned.createTask({ ...request(), projectId, title, columnId, dueOn });
      const other = await testProject(zoned, 'Outro');
      await task('Sem prazo', INITIAL_COLUMN_IDS.todo);
      await task('Em quinze dias', INITIAL_COLUMN_IDS.todo, '2026-11-20');
      await task('Em uma semana', INITIAL_COLUMN_IDS.todo, '2026-11-08');
      await task('Venceu ontem em UTC', INITIAL_COLUMN_IDS.todo, '2026-10-31');
      await task('Venceu semana passada', INITIAL_COLUMN_IDS.doing, '2026-10-24');
      await task('Andando', INITIAL_COLUMN_IDS.doing);
      await task('Vencida mas concluída', INITIAL_COLUMN_IDS.done, '2026-10-01');
      await task('Atrasada no outro', INITIAL_COLUMN_IDS.todo, '2026-10-30', other.id);
      for (let index = 0; index < 9; index += 1) {
        clock.now = new Date(`2026-10-2${index}T12:00:00Z`);
        await task(`Concluída ${index}`, INITIAL_COLUMN_IDS.done);
      }
      clock.now = new Date('2026-11-01T01:00:00Z');

      const overview = await zoned.projectOverview({ projectId: project.id });
      expect(overview).toMatchObject({ today: '2026-11-01', openTasks: 6, overdueTasks: 2, doneTotal: 10 });
      expect(titles(overview.now)).toEqual([
        'Venceu semana passada',
        'Venceu ontem em UTC',
        'Andando',
        'Em uma semana',
      ]);
      expect(overview.rest).toEqual([
        { columnId: INITIAL_COLUMN_IDS.todo, count: 2, withoutDue: 1, only: null, status: 'todo' },
      ]);
      // The last completed first, up to eight.
      expect(titles(overview.done)).toEqual([
        'Vencida mas concluída',
        'Concluída 8',
        'Concluída 7',
        'Concluída 6',
        'Concluída 5',
        'Concluída 4',
        'Concluída 3',
        'Concluída 2',
      ]);
      expect(await zoned.projectNavigation({ projectId: project.id })).toMatchObject({ openTasks: 6, overdueTasks: 2 });
      expect((await zoned.listProjects()).map((item) => [item.name, item.overdueTasks])).toEqual([
        [project.name, 2],
        ['Outro', 1],
      ]);

      zone = 'America/Sao_Paulo';
      const inSaoPaulo = await zoned.projectOverview({ projectId: project.id });
      expect(inSaoPaulo).toMatchObject({ today: '2026-10-31', overdueTasks: 1 });
      expect(titles(inSaoPaulo.now)).toEqual([
        'Venceu semana passada',
        'Andando',
        'Venceu ontem em UTC',
        'Em uma semana',
      ]);
      expect(await zoned.projectNavigation({ projectId: project.id })).toMatchObject({ overdueTasks: 1 });
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
      expect(last?.excerpt.startsWith('Primeira linha, segunda linha texto')).toBe(true);
      expect(last?.excerpt.endsWith('…')).toBe(true);
      expect(Array.from(last?.excerpt ?? '').length).toBeLessThanOrEqual(240);
      expect(overview.recent[1]).toEqual({
        type: 'drawing',
        id: drawing.id,
        title: 'Fluxo',
        updatedAt: drawing.updatedAt,
        excerpt: 'Ideia, Fluxo de ação',
        folder: null,
      });
      expect(overview.lastEdited).toEqual({
        type: 'document',
        id: notes.id,
        title: 'Notas',
        updatedAt: last?.updatedAt,
      });
    });

    it('names the folder of each item edited last', async () => {
      const mcp = await testFolder(service, project.id, 'MCP');
      const filed = await service.createDocument({
        ...request(),
        projectId: project.id,
        title: 'Filed',
        folderId: mcp.id,
      });
      await newDocument('Solto');
      const { recent } = await service.projectOverview({ projectId: project.id });
      expect(recent.map((item) => [item.id === filed.id ? 'filed' : 'loose', item.folder])).toEqual([
        ['loose', null],
        ['filed', { id: mcp.id, name: 'MCP' }],
      ]);
    });

    it("shows a document's first text that is not a heading, or its headings when it has only those", async () => {
      const blocks = (...pieces: [type: string, text: string][]): DocumentBlock[] =>
        pieces.map(([type, text]) => ({ type, content: [{ type: 'text', text, styles: {} }] }));
      const create = (title: string, content: DocumentBlock[]) =>
        service.createDocument({ ...request(), projectId: project.id, title, content });
      await create('Títulos', blocks(['heading', 'Plano'], ['paragraph', ''], ['heading', 'Etapas']));
      await create(
        'Visão',
        blocks(
          ['heading', 'Por que existe'],
          ['paragraph', 'Espaço pessoal e minimalista.'],
          ['heading', 'Princípios'],
        ),
      );
      const { recent } = await service.projectOverview({ projectId: project.id });
      expect(recent.map((item) => item.excerpt)).toEqual(['Espaço pessoal e minimalista.', 'Plano, Etapas']);
    });

    it('answers an empty project with nothing to show', async () => {
      expect(await service.projectOverview({ projectId: project.id })).toEqual({
        today: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/u),
        openTasks: 0,
        overdueTasks: 0,
        now: [],
        rest: [],
        done: [],
        doneTotal: 0,
        recent: [],
        lastEdited: null,
      });
      await expect(service.projectOverview({ projectId: randomUUID() })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });
});
