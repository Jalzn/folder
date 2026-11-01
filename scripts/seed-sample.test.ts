import { describe, expect, it } from 'vitest';
import { setupBlockNoteEditor } from '../src/web/testing/blocknote-editor.js';
import { checklistProgress } from '../src/workspace/domain/checklist.js';
import { readDocumentContent } from '../src/workspace/domain/document.js';
import { embedIds, isEmbedType } from '../src/workspace/domain/embeds.js';
import type { DocumentBlock } from '../src/workspace/domain/models.js';
import { SAMPLE_DESCRIPTIONS, SAMPLE_DOCUMENTS, visionDocument } from './seed-sample.js';

const blockNote = setupBlockNoteEditor();

describe('the sample descriptions', () => {
  // Opening a sample task in the drawer must not save it: the editor gives back what the seed wrote.
  for (const [title, description] of Object.entries(SAMPLE_DESCRIPTIONS))
    it(`come out of the real BlockNote as the seed writes them: ${title}`, () => {
      expect(blockNote.reload(description)).toEqual(description);
    });

  it("have the brief's checklists", () => {
    const progress = Object.entries(SAMPLE_DESCRIPTIONS)
      .map(([title, description]) => [title, checklistProgress(description)] as const)
      .filter(([, { total }]) => total > 0);
    expect(progress).toEqual([
      ['Gerar token pessoal no Perfil', { done: 2, total: 5 }],
      ['Colunas configuráveis no quadro', { done: 3, total: 3 }],
      ['Escolher luminária', { done: 1, total: 3 }],
    ]);
  });
});

/**
 * The document schema of the web (W2), with the embed blocks, in the real BlockNote. Its package is a
 * dependency of src/web, so it is loaded from there; the helper above has registered the DOM and
 * loaded the math package, whose stylesheet Node cannot import.
 */
async function documentEditor(content: DocumentBlock[]) {
  const webModules = new URL('../src/web/node_modules/', import.meta.url);
  const { BlockNoteEditor } = (await import(new URL('@blocknote/core/dist/blocknote.js', webModules).href)) as {
    BlockNoteEditor: { create(options: object): { document: unknown; _tiptapEditor: { destroy(): void } } };
  };
  // The blocks' views reach the app's API client, which reads the page's origin when loaded.
  (globalThis as unknown as { window: { happyDOM: { setURL(url: string): void } } }).window.happyDOM.setURL(
    'http://localhost/',
  );
  // By URL, so the scripts' type check, under node16 resolution, does not compile the web's sources.
  const { documentSchema } = (await import(new URL('../src/web/editor/schema.ts', import.meta.url).href)) as {
    documentSchema: object;
  };
  const editor = BlockNoteEditor.create({ schema: documentSchema, initialContent: content });
  const reloaded = editor.document as DocumentBlock[];
  editor._tiptapEditor.destroy();
  return reloaded;
}

describe('the sample documents', () => {
  const ids = {
    navigation: '9f3d8e3a-3b5a-4cad-9e4f-2c3d4e5f6071',
    token: '7d1b6c1e-1f3e-4a8b-9c2d-0a1b2c3d4e5f',
    onboarding: '8e2c7d2f-2a4f-4b9c-8d3e-1b2c3d4e5f60',
  };
  const documents: [string, DocumentBlock[]][] = [
    ...Object.entries(SAMPLE_DOCUMENTS),
    ['Visão do produto', visionDocument(ids)],
  ];

  // Opening a sample document must not save it: the editor gives back what the seed wrote, embeds included.
  for (const [title, content] of documents)
    it(`come out of the real BlockNote with the document schema as the seed writes them: ${title}`, async () => {
      expect(readDocumentContent(content, {}, { embeds: true })).toEqual(content);
      expect(await documentEditor(content)).toEqual(content);
    });

  it('embed in the vision the drawing, the task and the task in the trash of the brief', () => {
    const vision = visionDocument(ids);
    expect(embedIds(vision)).toEqual({ taskIds: [ids.token, ids.onboarding], canvasIds: [ids.navigation] });
    expect(vision.filter((block) => isEmbedType(block.type))).toEqual([
      { id: expect.any(String), type: 'drawingEmbed', props: { canvasId: ids.navigation }, children: [] },
      { id: expect.any(String), type: 'taskEmbed', props: { taskId: ids.token }, children: [] },
      { id: expect.any(String), type: 'taskEmbed', props: { taskId: ids.onboarding }, children: [] },
    ]);
  });
});
