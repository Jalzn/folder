import { describe, expect, it, vi } from 'vitest';
import { type DocumentBlock, readDocumentContent } from '#rich-text/domain';
import { importMarkdownWithMath } from '../../lib/files/markdown';
import type { EmbeddedItems } from '../../lib/queries/embeds';
import { setupBlockNoteEditor } from '../../testing/blocknote-editor';
import { documentMarkdown } from './document-markdown';

const blockNote = setupBlockNoteEditor();
const origin = 'https://tinyfold.exemplo';
const project = { id: 'p1', name: 'Tinyfold', color: 'violet', archived: false } as const;
const task = '11111111-1111-4111-8111-111111111111';
const drawing = '22222222-2222-4222-8222-222222222222';
const trashed = '33333333-3333-4333-8333-333333333333';
const missing = '44444444-4444-4444-8444-444444444444';

const blocks: DocumentBlock[] = [
  { id: 'a', type: 'paragraph', props: {}, content: [{ type: 'text', text: 'Antes.', styles: {} }], children: [] },
  { id: 'b', type: 'taskEmbed', props: { taskId: task }, children: [] },
  { id: 'c', type: 'drawingEmbed', props: { canvasId: drawing }, children: [] },
  { id: 'd', type: 'taskEmbed', props: { taskId: trashed }, children: [] },
  { id: 'e', type: 'drawingEmbed', props: { canvasId: missing }, children: [] },
];

const items: EmbeddedItems = {
  tasks: [
    {
      state: 'live',
      id: task,
      title: 'Gerar token [pessoal]',
      version: 1,
      column: { id: 'c1', name: 'Em andamento', isDone: false },
      dueOn: null,
      completedAt: null,
      labels: [],
      checklist: null,
      project,
    },
    { state: 'trashed', id: trashed, title: 'Na lixeira', version: 2 },
  ],
  drawings: [
    {
      state: 'live',
      id: drawing,
      title: 'Navegação',
      version: 3,
      project,
      folder: null,
      preview: null,
      empty: false,
    },
    { state: 'missing', id: missing },
  ],
};

describe('documentMarkdown', () => {
  it('writes the title and each embed as a link to the app, or as unavailable, after one read', async () => {
    const resolve = vi.fn(async () => items);
    const markdown = await documentMarkdown('Visão do produto', blocks, origin, resolve);
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledWith({ taskIds: [task, trashed], canvasIds: [drawing, missing] });
    expect(markdown).toBe(
      [
        '# Visão do produto',
        '',
        'Antes.',
        '',
        `[Tarefa: Gerar token \\[pessoal\\] (Em andamento)](${origin}/tarefas/${task})`,
        '',
        `[Desenho: Navegação](${origin}/desenhos/${drawing})`,
        '',
        '[Item indisponível]',
        '',
        '[Item indisponível]',
        '',
      ].join('\n'),
    );
  });

  it('reads nothing for a document without embeds', async () => {
    const resolve = vi.fn(async () => items);
    await documentMarkdown('Só texto', blocks.slice(0, 1), origin, resolve);
    expect(resolve).not.toHaveBeenCalled();
  });

  it('comes back from the import as paragraphs with the links, not as embeds', async () => {
    const markdown = await documentMarkdown('Visão do produto', blocks, origin, async () => items);
    const imported = readDocumentContent(await importMarkdownWithMath(markdown, blockNote.parse), {}, { embeds: true });
    expect(imported.map((block) => block.type)).not.toContain('taskEmbed');
    const links = JSON.stringify(imported);
    expect(links).toContain(`${origin}/tarefas/${task}`);
    expect(links).toContain(`${origin}/desenhos/${drawing}`);
    expect(links).toContain('Tarefa: Gerar token [pessoal] (Em andamento)');
  });
});
