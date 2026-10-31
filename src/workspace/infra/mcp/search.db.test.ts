import { describe, expect, it } from 'vitest';
import { paragraph, request, useAgentTools } from '../../testing/agent-tools.js';
import { drawingFixture } from '../../testing/canvas-scenes.js';

describe('search', () => {
  const agent = useAgentTools();

  it('searches documents, drawings and tasks ignoring case and accents', async () => {
    const document = await agent.service.createDocument({
      ...request(),
      title: 'Notas',
      content: [paragraph('Plano de AÇÃO')],
    });
    const canvas = await agent.service.createCanvas({ ...request(), title: 'Fluxo', scene: drawingFixture() });
    const task = await agent.service.createTask({ ...request(), title: 'Revisar ação' });
    await agent.service.createDocument({ ...request(), title: 'Outro', content: [paragraph('Sem vínculo')] });
    const found = await agent.json<{ items: { type: string; id: string; excerpt?: string }[]; nextCursor: null }>(
      'search',
      {
        query: 'acao',
      },
    );
    expect(found.items.map((item) => [item.type, item.id])).toEqual([
      ['task', task.task.id],
      ['drawing', canvas.id],
      ['document', document.id],
    ]);
    expect(found.items[2]?.excerpt).toBe('Plano de AÇÃO');
    expect(found.nextCursor).toBeNull();
    const onlyTasks = await agent.json<{ items: { type: string }[] }>('search', { query: 'AÇÃO', types: ['task'] });
    expect(onlyTasks.items.map((item) => item.type)).toEqual(['task']);
  });

  it('requires every word in any order, ranks title matches first and refuses an empty folded query', async () => {
    const body = await agent.service.createDocument({
      ...request(),
      title: 'Notas de reunião',
      content: [
        { type: 'heading', content: [{ type: 'text', text: 'Ideia', styles: {} }] },
        paragraph('Plano do MCP e do token no Perfil.'),
      ],
    });
    const titled = await agent.service.createDocument({
      ...request(),
      title: 'MCP somente leitura',
      content: [paragraph('Ideia antiga.')],
    });
    await agent.service.saveDocument({
      ...request(),
      id: body.id,
      expectedVersion: 1,
      title: body.title,
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
    const titled = await agent.service.createDocument({ ...request(), title: 'Relatório alfa' });
    // Four variation selectors make the raw title longer than the stored one, which ends before "alfa".
    const emoji = await agent.service.createDocument({
      ...request(),
      title: '⚠️⚠️⚠️⚠️ Notas',
      content: [paragraph('alfa no começo do texto.')],
    });
    const ids = async (query: string) =>
      (await agent.json<{ items: { id: string }[] }>('search', { query })).items.map((item) => item.id);
    expect(await ids('alfa')).toEqual([titled.id, emoji.id]);
    const token = await agent.service.createDocument({
      ...request(),
      title: 'Acesso',
      content: [paragraph('Use o token pessoal (MCP).')],
    });
    for (const query of ['"token pessoal"', 'MCP,', '(MCP)', 'token-pessoal', '«Token» — pessoal'])
      expect(await ids(query), query).toEqual([token.id]);
  });

  it('points the excerpt at the match after emoji with variation selectors', async () => {
    await agent.service.createDocument({
      ...request(),
      title: 'Emoji',
      content: [paragraph(`${'❤️'.repeat(200)} alvo-emoji fim`)],
    });
    const { items } = await agent.json<{ items: { excerpt: string }[] }>('search', { query: 'alvo-emoji' });
    expect(items[0]?.excerpt).toContain('alvo-emoji');
    expect(items[0]?.excerpt.isWellFormed()).toBe(true);
  });

  it('cuts excerpts around the first match and lists recent items without a query', async () => {
    const text = `${'Começo do texto. '.repeat(20)}O token pessoal aparece aqui.${' Fim.'.repeat(100)}`;
    await agent.service.createDocument({ ...request(), title: 'Longo', content: [paragraph(text)] });
    const { items } = await agent.json<{ items: { excerpt: string }[] }>('search', { query: 'token pessoal' });
    expect(items[0]?.excerpt.startsWith('…')).toBe(true);
    expect(items[0]?.excerpt.endsWith('…')).toBe(true);
    expect(items[0]?.excerpt).toContain('O token pessoal aparece aqui.');
    expect(items[0]?.excerpt.length).toBeLessThanOrEqual(240);
    const recent = await agent.json<{ items: { excerpt: string }[] }>('search');
    expect(recent.items[0]?.excerpt.startsWith('Começo do texto.')).toBe(true);
  });

  it('takes excerpts from a part of the text around the match, also after decomposed accents', async () => {
    // 4,000 accents stripped before the match: twice the margin read around the estimated place.
    const decomposed = 'ação, '.normalize('NFD').repeat(2000);
    const text = `${decomposed}alvo-profundo${' fim'.repeat(2000)}`;
    await agent.service.createDocument({ ...request(), title: 'Fundo', content: [paragraph(text)] });
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
      created.push((await agent.service.createDocument({ ...request(), title: `Documento ${index}` })).id);
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
      created.push(await agent.service.createDocument({ ...request(), title: `Página ${index}` }));
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
    const canvas = await agent.service.createCanvas({ ...request(), title: 'Arquitetura', scene });
    const { items } = await agent.json<{ items: { id: string; excerpt: string }[] }>('search', {
      query: 'zebulonserver',
    });
    expect(items.map((item) => item.id)).toEqual([canvas.id]);
    expect(items[0]?.excerpt).toContain('Zebulonserver');
  });
});
