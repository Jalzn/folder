import { describe, expect, it } from 'vitest';
import { paragraph, request, useAgentTools } from '../../testing/agent-tools.js';
import { drawingFixture } from '../../testing/canvas-scenes.js';

describe('search', () => {
  const agent = useAgentTools();

  it('searches documents, drawings and tasks ignoring case and accents', async () => {
    const document = await agent.service.createDocument({
      ...request(),
      projectId: agent.project.id,
      title: 'Notas',
      content: [paragraph('Plano de AÇÃO')],
    });
    const canvas = await agent.service.createCanvas({
      ...request(),
      projectId: agent.project.id,
      title: 'Fluxo',
      scene: drawingFixture(),
    });
    const task = await agent.service.createTask({ ...request(), title: 'Revisar ação', projectId: agent.project.id });
    await agent.service.createDocument({
      ...request(),
      projectId: agent.project.id,
      title: 'Outro',
      content: [paragraph('Sem vínculo')],
    });
    const found = await agent.json<{ items: { type: string; id: string; excerpt?: string }[]; nextCursor: null }>(
      'search',
      {
        query: 'acao',
      },
    );
    expect(found.items.map((item) => [item.type, item.id])).toEqual([
      ['task', task.id],
      ['drawing', canvas.id],
      ['document', document.id],
    ]);
    expect(found.items[1]?.excerpt).toBe('Ideia, Fluxo de ação');
    expect(found.items[2]?.excerpt).toBe('Plano de AÇÃO');
    expect(found.nextCursor).toBeNull();
    const onlyTasks = await agent.json<{ items: { type: string }[] }>('search', { query: 'AÇÃO', types: ['task'] });
    expect(onlyTasks.items.map((item) => item.type)).toEqual(['task']);
  });

  it('says which documents and drawings are pinned in their project', async () => {
    const pinned = await agent.service.createDocument({ ...request(), projectId: agent.project.id, title: 'Fixado' });
    await agent.service.createCanvas({ ...request(), projectId: agent.project.id, title: 'Solto' });
    await agent.service.createTask({ ...request(), projectId: agent.project.id, title: 'Tarefa' });
    await agent.service.pinItem({ type: 'document', id: pinned.id });
    const { items } = await agent.json<{ items: { type: string; pinned?: boolean }[] }>('search');
    expect(items.map((item) => [item.type, item.pinned])).toEqual([
      ['task', undefined],
      ['drawing', false],
      ['document', true],
    ]);
  });

  it('requires every word in any order, ranks title matches first and refuses an empty folded query', async () => {
    const body = await agent.service.createDocument({
      ...request(),
      projectId: agent.project.id,
      title: 'Notas de reunião',
      content: [
        { type: 'heading', content: [{ type: 'text', text: 'Ideia', styles: {} }] },
        paragraph('Plano do MCP e do token no Perfil.'),
      ],
    });
    const titled = await agent.service.createDocument({
      ...request(),
      projectId: agent.project.id,
      title: 'MCP somente leitura',
      content: [paragraph('Ideia antiga.')],
    });
    await agent.service.saveDocument({
      ...request(),
      id: body.id,
      expectedVersion: 1,
      title: 'Notas de reunião',
      content: [paragraph('Ideia: plano do MCP e do token no Perfil.')],
    });
    const ids = async (query: string) =>
      (await agent.json<{ items: { id: string }[] }>('search', { query })).items.map((item) => item.id);
    expect(await ids('MCP ideia')).toEqual([titled.id, body.id]);
    expect(await ids('token perfil')).toEqual([body.id]);
    expect(await ids('ideia do mcp')).toEqual([body.id]);
    expect(await ids('token ausente')).toEqual([]);
    expect(await agent.call('search', { query: '\u0301' })).toEqual({
      isError: true,
      text: 'A busca ficou vazia depois de ignorar acentos e pontuação. Use outras palavras.',
    });
  });

  it('ranks by the normalized title and ignores punctuation around query words', async () => {
    const titled = await agent.service.createDocument({
      ...request(),
      projectId: agent.project.id,
      title: 'Relatório alfa',
    });
    // Four variation selectors make the raw title longer than the stored one, which ends before "alfa".
    const emoji = await agent.service.createDocument({
      ...request(),
      projectId: agent.project.id,
      title: '⚠️⚠️⚠️⚠️ Notas',
      content: [paragraph('alfa no começo do texto.')],
    });
    const ids = async (query: string) =>
      (await agent.json<{ items: { id: string }[] }>('search', { query })).items.map((item) => item.id);
    expect(await ids('alfa')).toEqual([titled.id, emoji.id]);
    const token = await agent.service.createDocument({
      ...request(),
      projectId: agent.project.id,
      title: 'Acesso',
      content: [paragraph('Use o token pessoal (MCP).')],
    });
    for (const query of ['"token pessoal"', 'MCP,', '(MCP)', 'token-pessoal', '«Token» — pessoal'])
      expect(await ids(query), query).toEqual([token.id]);
  });

  it('points the excerpt at the match after emoji with variation selectors', async () => {
    await agent.service.createDocument({
      ...request(),
      projectId: agent.project.id,
      title: 'Emoji',
      content: [paragraph(`${'❤️'.repeat(200)} alvo-emoji fim`)],
    });
    const { items } = await agent.json<{ items: { excerpt: string }[] }>('search', { query: 'alvo-emoji' });
    expect(items[0]?.excerpt).toContain('alvo-emoji');
    expect(items[0]?.excerpt.isWellFormed()).toBe(true);
  });

  it('cuts excerpts around the first match and lists recent items without a query', async () => {
    const text = `${'Começo do texto. '.repeat(20)}O token pessoal aparece aqui.${' Fim.'.repeat(100)}`;
    await agent.service.createDocument({
      ...request(),
      projectId: agent.project.id,
      title: 'Longo',
      content: [paragraph(text)],
    });
    const { items } = await agent.json<{ items: { excerpt: string }[] }>('search', { query: 'token pessoal' });
    expect(items[0]?.excerpt.startsWith('…')).toBe(true);
    expect(items[0]?.excerpt.endsWith('…')).toBe(true);
    expect(items[0]?.excerpt).toContain('O token pessoal aparece aqui.');
    expect(items[0]?.excerpt.length).toBeLessThanOrEqual(240);
    const recent = await agent.json<{ items: { excerpt: string }[] }>('search');
    expect(recent.items[0]?.excerpt.startsWith('Começo do texto.')).toBe(true);
  });

  it('separates the blocks of a document in excerpts', async () => {
    await agent.service.createDocument({
      ...request(),
      projectId: agent.project.id,
      title: 'Visão',
      content: [
        { type: 'heading', props: { level: 1 }, content: [{ type: 'text', text: 'Por que existe', styles: {} }] },
        paragraph('Um espaço pessoal e minimalista.'),
        paragraph('Reúne escrita e desenho'),
        paragraph('sem excesso'),
      ],
    });
    const { items } = await agent.json<{ items: { excerpt: string }[] }>('search', { query: 'espaco' });
    expect(items[0]?.excerpt).toBe(
      'Por que existe, Um espaço pessoal e minimalista. Reúne escrita e desenho, sem excesso',
    );
  });

  it('takes excerpts from a part of the text around the match, also after decomposed accents', async () => {
    // 4,000 accents stripped before the match: twice the margin read around the estimated place.
    const decomposed = 'ação, '.normalize('NFD').repeat(2000);
    const text = `${decomposed}alvo-profundo${' fim'.repeat(2000)}`;
    await agent.service.createDocument({
      ...request(),
      projectId: agent.project.id,
      title: 'Fundo',
      content: [paragraph(text)],
    });
    const excerpt = async (query?: string) =>
      (await agent.json<{ items: { excerpt: string }[] }>('search', query ? { query } : {})).items[0]?.excerpt ?? '';
    const deep = await excerpt('alvo-profundo');
    expect(deep).toMatch(/^….*alvo-profundo fim.*…$/u);
    expect(Array.from(deep).length).toBeLessThanOrEqual(240);
    const start = await excerpt();
    expect(start.normalize('NFC')).toMatch(/^ação, ação, .*…$/u);
  });

  it('pages through results in a stable order', async () => {
    const created = [];
    for (let index = 0; index < 5; index += 1)
      created.push(
        (await agent.service.createDocument({ ...request(), projectId: agent.project.id, title: `Documento ${index}` }))
          .id,
      );
    const seen: string[] = [];
    let cursor: string | null | undefined;
    do {
      const page: { items: { id: string }[]; nextCursor: string | null } = await agent.json('search', {
        limit: 2,
        ...(cursor ? { cursor } : {}),
      });
      seen.push(...page.items.map((item) => item.id));
      cursor = page.nextCursor;
    } while (cursor);
    expect(seen).toEqual([...created].reverse());
    expect(await agent.call('search', { cursor: 'o:40' })).toEqual({
      isError: true,
      text: 'Cursor inválido. Repita a consulta sem cursor.',
    });
  });

  it('keeps paging after the last item shown when an earlier item is edited', async () => {
    const created = [];
    for (let index = 0; index < 5; index += 1)
      created.push(
        await agent.service.createDocument({ ...request(), projectId: agent.project.id, title: `Página ${index}` }),
      );
    const page = (cursor?: string) =>
      agent.json<{ items: { id: string }[]; nextCursor: string | null }>('search', {
        limit: 2,
        ...(cursor ? { cursor } : {}),
      });
    const first = await page();
    const oldest = created[0];
    if (!oldest || !first.nextCursor) throw new Error('missing page');
    await agent.service.saveDocument({
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

  it('finds drawings by the names of their frames', async () => {
    const scene = drawingFixture();
    scene.elements = scene.elements.map((element) =>
      element.type === 'frame' ? { ...element, name: 'Zebulonserver' } : element,
    );
    const canvas = await agent.service.createCanvas({
      ...request(),
      projectId: agent.project.id,
      title: 'Arquitetura',
      scene,
    });
    const { items } = await agent.json<{ items: { id: string; excerpt: string }[] }>('search', {
      query: 'zebulonserver',
    });
    expect(items.map((item) => item.id)).toEqual([canvas.id]);
    expect(items[0]?.excerpt).toContain('Zebulonserver');
  });
});
