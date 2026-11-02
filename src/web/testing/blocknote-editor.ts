import { registerHooks } from 'node:module';
import { BlockNoteEditor, BlockNoteSchema, createBlockSpec } from '@blocknote/core';
import { type DocumentContent, readDocumentContent } from '@tinyfold/workspace/domain';
import { Window } from 'happy-dom';
import { afterAll, beforeAll, vi } from 'vitest';

// The package imports KaTeX CSS at runtime. Node validates its real schema/parser without needing stylesheets.
const cssModules = registerHooks({
  load(url, context, nextLoad) {
    return url.endsWith('.css')
      ? { format: 'module', source: 'export default {}', shortCircuit: true }
      : nextLoad(url, context);
  },
});
const { createReactInlineMathSpec, createReactMathBlockSpec } = await import('@blocknote/math-block');
cssModules.deregister();

/**
 * An empty element of the happy-dom document that setupBlockNoteEditor puts on globalThis. The global is reached
 * by hand because scripts/ also compiles this file, for seed-sample.test.ts, without the DOM's types.
 */
const emptyElement = () =>
  (globalThis as unknown as { document: { createElement(tag: 'div'): never } }).document.createElement('div');

/**
 * A document's embed block, as the web's schema declares it (editor/blocks/embed-specs.tsx), drawn here as an
 * empty element: the tests read the blocks, not the card or the figure.
 */
const embedSpec = <const Type extends string, const Prop extends string>(type: Type, prop: Prop) =>
  createBlockSpec(
    { type, propSchema: { [prop]: { default: '' } } as Record<Prop, { default: '' }>, content: 'none' },
    { render: () => ({ dom: emptyElement() }) },
  )();

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    mathBlock: createReactMathBlockSpec(),
    taskEmbed: embedSpec('taskEmbed', 'taskId'),
    drawingEmbed: embedSpec('drawingEmbed', 'canvasId'),
  },
  inlineContentSpecs: { math: createReactInlineMathSpec() },
});
const createEditor = (initialContent?: DocumentContent) =>
  BlockNoteEditor.create({
    schema,
    ...(initialContent ? { initialContent: initialContent as never } : {}),
  });

/**
 * The real BlockNote 0.56 editor with the document's blocks, the embeds included, on happy-dom, for the calling
 * test file.
 * Call at the top level of the file: it registers the DOM before and removes it after the tests.
 */
export function setupBlockNoteEditor() {
  let editor: ReturnType<typeof createEditor>;
  let window: Window;
  beforeAll(() => {
    window = new Window();
    window.document.write('<!doctype html><html><head></head><body></body></html>');
    for (const key of [
      'window',
      'document',
      'navigator',
      'HTMLElement',
      'Element',
      'Node',
      'DOMParser',
      'MutationObserver',
      'DocumentFragment',
    ] as const) {
      vi.stubGlobal(key, key === 'window' ? window : window[key]);
    }
    editor = createEditor();
  });
  afterAll(async () => {
    editor?._tiptapEditor.destroy();
    await window.happyDOM.close();
    vi.unstubAllGlobals();
  });
  return {
    parse: (source: string) => editor.tryParseMarkdownToBlocks(source) as unknown as DocumentContent,
    exportMarkdown: (blocks: DocumentContent) =>
      editor.blocksToMarkdownLossy(blocks as unknown as typeof editor.document),
    /** The ProseMirror document an editor makes of the blocks, as the origin markers read it. */
    prosemirrorDoc(blocks: DocumentContent) {
      const opened = createEditor(blocks);
      const doc = opened.prosemirrorState.doc;
      opened._tiptapEditor.destroy();
      return doc;
    },
    /**
     * The blocks as an editor of `schema` gives them back when it opens them, as JSON, as it saves them: the app's
     * own document or description schema, with its React blocks, instead of this file's.
     */
    reopen(schema: unknown, blocks: DocumentContent): DocumentContent {
      const opened = BlockNoteEditor.create({ schema: schema as never, initialContent: blocks as never });
      const result = JSON.parse(JSON.stringify(opened.document)) as DocumentContent;
      opened._tiptapEditor.destroy();
      return result;
    },
    /** Opens the blocks in a new editor, as reopening the document does; both sides must be a valid document. */
    reload(blocks: DocumentContent): DocumentContent {
      readDocumentContent(blocks, {}, { embeds: true });
      const reloaded = createEditor(blocks);
      // As it is saved: JSON, where an embed's absent content is no key at all.
      const result = JSON.parse(JSON.stringify(reloaded.document)) as DocumentContent;
      readDocumentContent(result, {}, { embeds: true });
      reloaded._tiptapEditor.destroy();
      return result;
    },
  };
}
