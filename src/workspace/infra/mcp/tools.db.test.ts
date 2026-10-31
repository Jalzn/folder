import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { coreModule, createDatabase, type Database, migrate } from '@tinyfold/core/infra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocumentBlock } from '../../domain/models.js';
import { drawingFixture } from '../../testing/canvas-scenes.js';
import { pngHeader } from '../../testing/png.js';
import { workspaceModule } from '../module.js';
import { createWorkspaceService } from '../service.js';
import { createWorkspaceTools } from './index.js';

const request = () => ({ requestId: randomUUID() });
const paragraph = (text: string, id?: string): DocumentBlock => ({
  ...(id ? { id } : {}),
  type: 'paragraph',
  content: [{ type: 'text', text, styles: {} }],
});
const missingId = '00000000-0000-4000-8000-000000000000';

describe('agent read tools', () => {
  let directory: string;
  let db: Database;
  let service: ReturnType<typeof createWorkspaceService>;
  let tools: ReturnType<typeof createWorkspaceTools>;
  let now: Date;
  const logError = vi.fn();

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'tinyfold-tools-'));
    db = createDatabase(join(directory, 'test.sqlite'));
    await migrate(db, [coreModule, workspaceModule]);
    now = new Date('2026-10-31T12:00:00Z');
    // Distinct timestamps make the recency order explicit.
    service = createWorkspaceService(db, () => {
      now = new Date(now.getTime() + 1000);
      return now;
    });
    tools = createWorkspaceTools(db, { logError });
    logError.mockClear();
  });
  afterEach(async () => {
    await db.destroy();
    await rm(directory, { recursive: true, force: true });
  });

  async function call(name: string, input: Record<string, unknown>) {
    const tool = tools.find((candidate) => candidate.name === name);
    if (!tool) throw new Error(`Unknown tool ${name}`);
    const result = await tool.handler(tool.inputSchema.parse(input));
    const [first] = result.content;
    return { isError: result.isError === true, text: first?.type === 'text' ? first.text : '' };
  }
  const json = async <T = Record<string, unknown>>(name: string, input: Record<string, unknown> = {}) =>
    JSON.parse((await call(name, input)).text) as T;

  it('searches documents, drawings and tasks ignoring case and accents', async () => {
    const document = await service.createDocument({
      ...request(),
      title: 'Notas',
      content: [paragraph('Plano de AÇÃO')],
    });
    const canvas = await service.createCanvas({ ...request(), title: 'Fluxo', scene: drawingFixture() });
    const task = await service.createTask({ ...request(), title: 'Revisar ação' });
    await service.createDocument({ ...request(), title: 'Outro', content: [paragraph('Sem vínculo')] });
    const found = await json<{ items: { type: string; id: string; excerpt?: string }[]; nextCursor: null }>('search', {
      query: 'acao',
    });
    expect(found.items.map((item) => [item.type, item.id])).toEqual([
      ['task', task.task.id],
      ['drawing', canvas.id],
      ['document', document.id],
    ]);
    expect(found.items[2]?.excerpt).toBe('Plano de AÇÃO');
    expect(found.nextCursor).toBeNull();
    const onlyTasks = await json<{ items: { type: string }[] }>('search', { query: 'AÇÃO', types: ['task'] });
    expect(onlyTasks.items.map((item) => item.type)).toEqual(['task']);
  });

  it('requires every word in any order, ranks title matches first and refuses an empty folded query', async () => {
    const body = await service.createDocument({
      ...request(),
      title: 'Notas de reunião',
      content: [
        { type: 'heading', content: [{ type: 'text', text: 'Ideia', styles: {} }] },
        paragraph('Plano do MCP e do token no Perfil.'),
      ],
    });
    const titled = await service.createDocument({
      ...request(),
      title: 'MCP somente leitura',
      content: [paragraph('Ideia antiga.')],
    });
    await service.saveDocument({
      ...request(),
      id: body.id,
      expectedVersion: 1,
      title: body.title,
      content: [paragraph('Ideia: plano do MCP e do token no Perfil.')],
    });
    const ids = async (query: string) =>
      (await json<{ items: { id: string }[] }>('search', { query })).items.map((item) => item.id);
    expect(await ids('MCP ideia')).toEqual([titled.id, body.id]);
    expect(await ids('token perfil')).toEqual([body.id]);
    expect(await ids('ideia do mcp')).toEqual([body.id]);
    expect(await ids('token ausente')).toEqual([]);
    expect(await call('search', { query: '\u0301' })).toEqual({
      isError: true,
      text: 'A busca ficou vazia depois de ignorar acentos. Use outras palavras.',
    });
  });

  it('points the excerpt at the match after emoji with variation selectors', async () => {
    await service.createDocument({
      ...request(),
      title: 'Emoji',
      content: [paragraph(`${'❤️'.repeat(200)} alvo-emoji fim`)],
    });
    const { items } = await json<{ items: { excerpt: string }[] }>('search', { query: 'alvo-emoji' });
    expect(items[0]?.excerpt).toContain('alvo-emoji');
    expect(items[0]?.excerpt.isWellFormed()).toBe(true);
  });

  it('cuts excerpts around the first match and lists recent items without a query', async () => {
    const text = `${'Começo do texto. '.repeat(20)}O token pessoal aparece aqui.${' Fim.'.repeat(100)}`;
    await service.createDocument({ ...request(), title: 'Longo', content: [paragraph(text)] });
    const { items } = await json<{ items: { excerpt: string }[] }>('search', { query: 'token pessoal' });
    expect(items[0]?.excerpt.startsWith('…')).toBe(true);
    expect(items[0]?.excerpt.endsWith('…')).toBe(true);
    expect(items[0]?.excerpt).toContain('O token pessoal aparece aqui.');
    expect(items[0]?.excerpt.length).toBeLessThanOrEqual(240);
    const recent = await json<{ items: { excerpt: string }[] }>('search');
    expect(recent.items[0]?.excerpt.startsWith('Começo do texto.')).toBe(true);
  });

  it('pages through results in a stable order', async () => {
    const created = [];
    for (let index = 0; index < 5; index += 1)
      created.push((await service.createDocument({ ...request(), title: `Documento ${index}` })).id);
    const seen: string[] = [];
    let cursor: string | null | undefined;
    do {
      const page: { items: { id: string }[]; nextCursor: string | null } = await json('search', {
        limit: 2,
        ...(cursor ? { cursor } : {}),
      });
      seen.push(...page.items.map((item) => item.id));
      cursor = page.nextCursor;
    } while (cursor);
    expect(seen).toEqual([...created].reverse());
    expect(await call('search', { cursor: 'o:40' })).toEqual({
      isError: true,
      text: 'Cursor inválido. Repita a consulta sem cursor.',
    });
  });

  it('keeps paging after the last item shown when an earlier item is edited', async () => {
    const created = [];
    for (let index = 0; index < 5; index += 1)
      created.push(await service.createDocument({ ...request(), title: `Página ${index}` }));
    const page = (cursor?: string) =>
      json<{ items: { id: string }[]; nextCursor: string | null }>('search', {
        limit: 2,
        ...(cursor ? { cursor } : {}),
      });
    const first = await page();
    const oldest = created[0];
    if (!oldest || !first.nextCursor) throw new Error('missing page');
    await service.saveDocument({
      ...request(),
      id: oldest.id,
      expectedVersion: 1,
      title: 'Página 0 editada',
      content: [],
    });
    const second = await page(first.nextCursor);
    const ids = [...first.items, ...second.items].map((item) => item.id);
    expect(ids).toEqual([created[4], created[3], created[2], created[1]].map((document) => document?.id));
    expect(second.nextCursor).toBeNull();
  });

  it('leaves trashed items out and flags archived projects', async () => {
    const archived = await service.createProject({ ...request(), name: 'Antigo' });
    const kept = await service.createDocument({ ...request(), title: 'Mantido', projectId: archived.id });
    const trashed = await service.createDocument({ ...request(), title: 'Na lixeira', projectId: archived.id });
    const done = await service.createTask({ ...request(), title: 'Concluída', projectId: archived.id, status: 'done' });
    const open = await service.createTask({ ...request(), title: 'Aberta', projectId: archived.id });
    const removed = await service.createTask({ ...request(), title: 'Removida', projectId: archived.id });
    await service.deleteDocument({ ...request(), id: trashed.id, expectedVersion: trashed.version });
    await service.deleteTask({ ...request(), id: removed.task.id, expectedVersion: removed.task.version });
    await service.updateProject({ ...request(), id: archived.id, expectedVersion: archived.version, archived: true });
    await service.createDocument({ ...request(), title: 'Solto' });

    expect(await json('list_projects')).toEqual({
      projects: [],
      withoutProject: { documents: 1, drawings: 0, openTasks: 0 },
    });
    const { projects } = await json<{ projects: Record<string, unknown>[] }>('list_projects', {
      includeArchived: true,
    });
    expect(projects).toEqual([
      expect.objectContaining({ id: archived.id, archived: true, documents: 1, drawings: 0, openTasks: 1 }),
    ]);
    const { items } = await json<{ items: { id: string; projectArchived: boolean }[] }>('search', {
      projectId: archived.id,
    });
    expect(items.map((item) => item.id)).toEqual([open.task.id, done.task.id, kept.id]);
    expect(items.every((item) => item.projectArchived)).toBe(true);
    for (const [name, id] of [
      ['read_document', trashed.id],
      ['read_document', missingId],
      ['read_task', removed.task.id],
    ] as const)
      expect(await call(name, { id })).toMatchObject({ isError: true, text: expect.stringContaining('na lixeira') });
  });

  it('reads a document as Markdown with the tasks created from it', async () => {
    const project = await service.createProject({ ...request(), name: 'Tinyfold' });
    const document = await service.createDocument({
      ...request(),
      title: 'Visão',
      projectId: project.id,
      content: [
        {
          id: 'c',
          type: 'checkListItem',
          props: { checked: false },
          content: [{ type: 'text', text: 'Gerar token', styles: {} }],
        },
        {
          id: 'k',
          type: 'codeBlock',
          props: { language: 'sh' },
          content: [{ type: 'text', text: 'pnpm dev', styles: {} }],
        },
      ],
    });
    const task = await service.createTask({
      ...request(),
      title: 'Gerar token',
      status: 'doing',
      source: { documentId: document.id, blockId: 'c', excerpt: 'Gerar token' },
    });
    const { text, isError } = await call('read_document', { id: document.id });
    expect(isError).toBe(false);
    expect(text).toBe(
      [
        '# Visão',
        '',
        '- Projeto: Tinyfold',
        `- Atualizado: ${document.updatedAt} · versão 1`,
        `- ID: ${document.id}`,
        '- Tarefas originadas aqui:',
        `  - "Gerar token" (Em andamento, id ${task.task.id})`,
        '',
        '---',
        '',
        '- [ ] Gerar token',
        '',
        '```sh',
        'pnpm dev',
        '```',
      ].join('\n'),
    );
  });

  it('pages a long document and refuses a cursor once the document changed', async () => {
    const blocks = Array.from({ length: 30 }, (_, index) => paragraph(`${index} ${'palavra '.repeat(400)}`));
    const document = await service.createDocument({ ...request(), title: 'Longo', content: blocks });
    const first = await call('read_document', { id: document.id });
    const cursor = /"cursor":"(1:\d+)"/u.exec(first.text)?.[1];
    expect(first.text).toContain('Página 1 de 2.');
    expect(first.text.length).toBeLessThan(70_000);
    const second = await call('read_document', { id: document.id, cursor });
    expect(second.text.startsWith('# Longo')).toBe(false);
    expect(second.text.endsWith('Página 2 de 2.')).toBe(true);
    await service.saveDocument({ ...request(), id: document.id, expectedVersion: 1, title: 'Longo', content: blocks });
    expect(await call('read_document', { id: document.id, cursor })).toEqual({
      isError: true,
      text: 'O documento mudou desde a primeira página. Leia de novo sem cursor.',
    });
  });

  it('describes the current scene of a drawing', async () => {
    const canvas = await service.createCanvas({ ...request(), title: 'Fluxo', scene: drawingFixture() });
    const { text } = await call('read_drawing', { id: canvas.id });
    expect(text).toContain(
      `Desenho "Fluxo" · sem projeto · versão 1 · atualizado em ${canvas.updatedAt} · ID ${canvas.id}`,
    );
    expect(text).toContain('Imagem: indisponível');
    expect(text).toContain('Quadro q1 "Ideia" (0, 0, 800×600)');
    expect(text).toContain('  s1 seta: e1 → (200, 0)');
    const imageOnly = await call('read_drawing', { id: canvas.id, structure: false });
    expect(imageOnly.text).not.toContain('Elementos ativos');
    const empty = await service.createCanvas({ ...request(), title: 'Vazio' });
    expect((await call('read_drawing', { id: empty.id })).text).toContain('Imagem: o desenho está vazio');
  });

  it('sends the stored preview as an image and flags one from an older version', async () => {
    const canvas = await service.createCanvas({ ...request(), title: 'Fluxo', scene: drawingFixture() });
    const png = pngHeader(1200, 800, 500);
    await service.saveCanvasPreview({ id: canvas.id, version: 1, png });
    const tool = tools.find((candidate) => candidate.name === 'read_drawing');
    const read = async (input: Record<string, unknown>) => tool?.handler(tool.inputSchema.parse(input));
    const current = await read({ id: canvas.id });
    expect(current?.content[0]).toMatchObject({
      text: expect.stringContaining('Imagem: versão 1 (atual), 1200×800 px'),
    });
    expect(current?.content[1]).toEqual({
      type: 'image',
      data: Buffer.from(png).toString('base64'),
      mimeType: 'image/png',
    });
    await service.saveCanvas({
      ...request(),
      id: canvas.id,
      expectedVersion: 1,
      title: 'Fluxo',
      scene: drawingFixture(),
    });
    const stale = await read({ id: canvas.id });
    expect(stale?.content[0]).toMatchObject({
      text: expect.stringContaining(
        'Imagem: versão 1, 1200×800 px; a cena atual é a 2. A estrutura abaixo está atualizada',
      ),
    });
    expect(stale?.content).toHaveLength(2);
    const structureOnly = await read({ id: canvas.id, image: false });
    expect(structureOnly?.content).toHaveLength(1);
    expect(structureOnly?.content[0]).not.toMatchObject({ text: expect.stringContaining('Imagem:') });
  });

  it('lists tasks in board order with filters and a trashed source', async () => {
    const project = await service.createProject({ ...request(), name: 'Quadro' });
    const document = await service.createDocument({
      ...request(),
      title: 'Origem',
      projectId: project.id,
      content: [paragraph('Trecho importante', 'b')],
    });
    const fromText = await service.createTask({
      ...request(),
      title: 'Nasceu do trecho',
      source: { documentId: document.id, blockId: 'b', excerpt: 'Trecho importante' },
    });
    const doing = await service.createTask({ ...request(), title: 'Em curso', projectId: project.id, status: 'doing' });
    const first = await service.createTask({ ...request(), title: 'Primeira', projectId: project.id });
    await service.createTask({ ...request(), title: 'Pronta', projectId: project.id, status: 'done' });
    await service.createTask({ ...request(), title: 'Fora do projeto' });

    const all = await json<{ tasks: { title: string }[] }>('list_tasks', { projectId: project.id });
    expect(all.tasks.map((task) => task.title)).toEqual(['Nasceu do trecho', 'Primeira', 'Em curso', 'Pronta']);
    const filtered = await json<{ tasks: { id: string }[] }>('list_tasks', {
      status: ['todo', 'doing'],
      query: 'PRIMEIRA',
    });
    expect(filtered.tasks.map((task) => task.id)).toEqual([first.task.id]);
    const paged = await json<{ tasks: { id: string }[]; nextCursor: string }>('list_tasks', {
      projectId: project.id,
      limit: 2,
    });
    expect(paged.nextCursor).toBe(`t~0~${first.task.position}~${first.task.id}`);
    const next = await json<{ tasks: { id: string }[]; nextCursor: null }>('list_tasks', {
      projectId: project.id,
      cursor: paged.nextCursor,
    });
    expect(next.tasks.map((task) => task.id)[0]).toBe(doing.task.id);
    expect(next.nextCursor).toBeNull();

    await service.deleteDocument({ ...request(), id: document.id, expectedVersion: document.version });
    const listed = await json<{ tasks: { id: string; source: unknown }[] }>('list_tasks', { query: 'trecho' });
    expect(listed.tasks[0]?.source).toEqual({ documentId: document.id, documentTitle: null, available: false });
    expect(await json('read_task', { id: fromText.task.id })).toMatchObject({
      title: 'Nasceu do trecho',
      status: 'todo',
      statusLabel: 'A fazer',
      projectName: 'Quadro',
      position: 0,
      source: {
        documentId: document.id,
        documentTitle: null,
        blockId: 'b',
        excerpt: 'Trecho importante',
        available: false,
        blockAvailable: false,
      },
    });
  });

  it('logs unexpected failures and answers with a generic message', async () => {
    await db.destroy();
    expect(await call('list_projects', {})).toEqual({
      isError: true,
      text: 'Falha interna ao consultar o Tinyfold. Tente de novo.',
    });
    expect(logError).toHaveBeenCalledTimes(1);
    db = createDatabase(join(directory, 'test.sqlite'));
  });
});
