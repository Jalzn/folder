import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { coreModule, type Database, migrate, tables } from '#core/infra';
import { useTempDatabase } from '#core/testing';
import type { Project } from '#projects/domain';
import type { DocumentBlock } from '#rich-text/domain';
import { workspaceModule } from '../../../workspace/infra/module.js';
import { testProject } from '../../testing/workspace/projects.js';
import { createWorkspaceService } from '../../workspace/service.js';

const request = () => ({ requestId: randomUUID() });
const content = (text: string, blockId = 'block-one'): DocumentBlock[] => [
  { id: blockId, type: 'paragraph', content: [{ type: 'text', text, styles: {} }], children: [] },
];
describe('workspace persistence and adversarial cases', () => {
  const database = useTempDatabase([coreModule, workspaceModule]);

  let db: Database;
  let service: ReturnType<typeof createWorkspaceService>;
  let project: Project;
  beforeEach(async () => {
    db = database.db;
    service = createWorkspaceService(db);
    project = await testProject(service);
  });
  it('creates a document in its project, persists edits and reopens after server restart', async () => {
    const document = await service.createDocument({ ...request(), projectId: project.id });
    expect(document).toEqual({ id: expect.any(String), version: 1, updatedAt: expect.any(String) });
    expect(await service.getDocument({ id: document.id })).toMatchObject({
      title: 'Sem título',
      projectId: project.id,
      content: [],
    });
    const ack = await service.saveDocument({
      ...request(),
      id: document.id,
      expectedVersion: 1,
      title: 'Primeira ideia',
      content: content('Continuar no celular'),
    });
    expect(ack).toEqual({ id: document.id, version: 2, updatedAt: expect.any(String) });
    await db.destroy();
    db = database.open();
    await migrate(db, [coreModule, workspaceModule]);
    const saved = await createWorkspaceService(db).getDocument({ id: document.id });
    expect(saved).toMatchObject({ title: 'Primeira ideia', plainText: 'Continuar no celular', version: 2 });
  });
  it('persists, reopens and searches display and inline math, including unfinished LaTeX', async () => {
    const equations: DocumentBlock[] = [
      {
        id: 'equation',
        type: 'mathBlock',
        props: {},
        content: [{ type: 'text', text: String.raw`\frac{a+b}{c}`, styles: {} }],
        children: [],
      },
      {
        id: 'formula',
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Identidade: ', styles: {} },
          { type: 'math', props: {}, content: String.raw`\sin^2(x)+\cos^2(x)=1` },
        ],
      },
    ];
    const document = await service.createDocument({
      ...request(),
      projectId: project.id,
      title: 'Equações do projeto',
      content: equations,
    });
    await db.destroy();
    db = database.open();
    await migrate(db, [coreModule, workspaceModule]);
    service = createWorkspaceService(db);
    expect((await service.getDocument({ id: document.id })).content).toEqual(equations);
    expect(
      (await service.search({ query: String.raw`\frac{a+b}{c}`, types: ['document'] })).items.map((item) => item.id),
    ).toEqual([document.id]);
    expect(
      (await service.search({ query: String.raw`\sin^2(x)`, types: ['document'] })).items.map((item) => item.id),
    ).toEqual([document.id]);
    const unfinished: DocumentBlock[] = [
      { id: 'equation', type: 'mathBlock', props: {}, content: String.raw`\frac{a}{` },
    ];
    const ack = await service.saveDocument({
      ...request(),
      id: document.id,
      expectedVersion: document.version,
      title: 'Equações do projeto',
      content: unfinished,
    });
    expect((await service.getDocument({ id: document.id })).content).toEqual(unfinished);
    expect((await service.getDocument({ id: document.id })).version).toBe(ack.version);
    expect(
      (await service.search({ query: String.raw`\frac{a}{`, types: ['document'] })).items.map((item) => item.id),
    ).toEqual([document.id]);
  });
  it('rejects malformed math before writing and preserves the previous valid document', async () => {
    const document = await service.createDocument({
      ...request(),
      projectId: project.id,
      content: [{ id: 'math', type: 'mathBlock', props: {}, content: 'x^2' }],
    });
    expect(() =>
      service.saveDocument({
        ...request(),
        id: document.id,
        expectedVersion: document.version,
        title: 'Inválido',
        content: [{ type: 'paragraph', content: [{ type: 'math', content: { latex: 'x^2' } }] }],
      }),
    ).toThrow();
    expect((await service.getDocument({ id: document.id })).content).toEqual([
      { id: 'math', type: 'mathBlock', props: {}, content: 'x^2' },
    ]);
    expect((await service.getDocument({ id: document.id })).version).toBe(1);
  });
  it('saves and creates documents with task and drawing embeds, and refuses bad ones before writing', async () => {
    const task = await service.createTask({ ...request(), projectId: project.id, title: 'Incorporada' });
    const canvas = await service.createCanvas({ ...request(), projectId: project.id, title: 'Figura' });
    const embeds = [
      { id: 'e1', type: 'taskEmbed', props: { taskId: task.id }, children: [] },
      { id: 'p1', type: 'paragraph', content: [{ type: 'text', text: 'Entre os dois', styles: {} }], children: [] },
      { id: 'e2', type: 'drawingEmbed', props: { canvasId: canvas.id }, children: [] },
    ];
    const created = await service.createDocument({
      ...request(),
      projectId: project.id,
      title: 'Com',
      content: embeds,
    });
    expect((await service.getDocument({ id: created.id })).content).toEqual(embeds);
    const saved = await service.saveDocument({
      ...request(),
      id: created.id,
      expectedVersion: 1,
      title: 'Com',
      content: [...embeds].reverse(),
    });
    const stored = await service.getDocument({ id: created.id });
    expect(stored).toMatchObject({ version: saved.version, plainText: 'Entre os dois' });
    expect(stored.content.map((block) => block.id)).toEqual(['e2', 'p1', 'e1']);
    const save = (content: unknown) =>
      service.saveDocument({ ...request(), id: created.id, expectedVersion: saved.version, title: 'Com', content });
    expect(() => save([{ type: 'taskEmbed', props: { taskId: 'nada' }, children: [] }])).toThrow(
      'As propriedades do item incorporado são inválidas.',
    );
    expect(() =>
      save(Array.from({ length: 201 }, () => ({ type: 'drawingEmbed', props: { canvasId: canvas.id }, children: [] }))),
    ).toThrow('Um documento aceita até 200 itens incorporados.');
    expect((await service.getDocument({ id: created.id })).version).toBe(saved.version);
  });
  it('retries a save once, rejects request reuse and leaves a compact acknowledgment', async () => {
    const document = await service.createDocument({ ...request(), projectId: project.id });
    const input = {
      ...request(),
      id: document.id,
      expectedVersion: 1,
      title: 'Planejamento',
      content: content('Texto importante '.repeat(1000)),
    };
    const ack = await service.saveDocument(input);
    expect(await service.saveDocument(input)).toEqual(ack);
    expect((await service.getDocument({ id: document.id })).version).toBe(2);
    await expect(service.saveDocument({ ...input, title: 'Outro texto' })).rejects.toMatchObject({
      code: 'REQUEST_REUSED',
    });
    const mutation = await tables<{ core_mutations: { request_id: string; response: string } }>(db)
      .selectFrom('core_mutations')
      .select('response')
      .where('request_id', '=', input.requestId)
      .executeTakeFirstOrThrow();
    expect(mutation.response.length).toBeLessThan(200);
  });
  it('reads a trashed document for its owner, as a drawing, and still refuses to save it (decision 1)', async () => {
    const document = await service.createDocument({
      ...request(),
      projectId: project.id,
      content: content('Rascunho na lixeira'),
    });
    const trashed = await service.deleteDocument({ ...request(), id: document.id, expectedVersion: 1 });
    expect(await service.getDocument({ id: document.id })).toMatchObject({
      id: document.id,
      version: trashed.version,
      deletedAt: trashed.updatedAt,
      plainText: 'Rascunho na lixeira',
    });
    await expect(
      service.saveDocument({
        ...request(),
        id: document.id,
        expectedVersion: trashed.version,
        title: 'Cópia',
        content: content('Texto novo'),
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect((await service.getDocument({ id: document.id })).plainText).toBe('Rascunho na lixeira');
  });
  it('cuts the summary of a listed document at 280 code points, never inside an emoji (decision 7)', async () => {
    const text = `${'a'.repeat(279)}😀 e mais texto`;
    const document = await service.createDocument({ ...request(), projectId: project.id, content: content(text) });
    const [listed] = await service.listDocuments({ projectId: project.id });
    expect(listed).toMatchObject({ id: document.id, plainText: `${'a'.repeat(279)}😀` });
  });
});
