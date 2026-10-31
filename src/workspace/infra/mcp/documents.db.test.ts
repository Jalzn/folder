import { describe, expect, it } from 'vitest';
import { paragraph, request, useAgentTools } from '../../testing/agent-tools.js';

describe('read_document', () => {
  const agent = useAgentTools();

  it('reads a document as Markdown with the tasks created from it', async () => {
    const project = await agent.service.createProject({ ...request(), name: 'Tinyfold' });
    const document = await agent.service.createDocument({
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
    const task = await agent.service.createTask({
      ...request(),
      title: 'Gerar token',
      status: 'doing',
      source: { documentId: document.id, blockId: 'c', excerpt: 'Gerar token' },
    });
    const { text, isError } = await agent.call('read_document', { id: document.id });
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
    const document = await agent.service.createDocument({ ...request(), title: 'Longo', content: blocks });
    const first = await agent.call('read_document', { id: document.id });
    const cursor = /"cursor":"(1:\d+)"/u.exec(first.text)?.[1];
    expect(first.text).toContain('Página 1 de 2.');
    expect(first.text.length).toBeLessThan(70_000);
    const second = await agent.call('read_document', { id: document.id, cursor });
    expect(second.text.startsWith('# Longo')).toBe(false);
    expect(second.text.endsWith('Página 2 de 2.')).toBe(true);
    await agent.service.saveDocument({
      ...request(),
      id: document.id,
      expectedVersion: 1,
      title: 'Longo',
      content: blocks,
    });
    expect(await agent.call('read_document', { id: document.id, cursor })).toEqual({
      isError: true,
      text: 'O documento mudou desde a primeira página. Leia de novo sem cursor.',
    });
  });

  it('keeps the space at a mid-line page cut', async () => {
    const document = await agent.service.createDocument({
      ...request(),
      title: 'Corte',
      content: [paragraph('ab '.repeat(30_000))],
    });
    const first = await agent.call('read_document', { id: document.id });
    const cursor = /"cursor":"(1:\d+)"/u.exec(first.text)?.[1];
    const body = first.text.split('\n\n---\n\n')[1]?.split('\n\n---\nPágina')[0] ?? '';
    expect(body.endsWith(' ')).toBe(true);
    const second = await agent.call('read_document', { id: document.id, cursor });
    expect(second.text.startsWith('ab ')).toBe(true);
  });
});
