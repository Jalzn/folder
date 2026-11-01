import { registerHooks } from 'node:module';
import { BlockNoteEditor, BlockNoteSchema } from '@blocknote/core';
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

const schema = BlockNoteSchema.create().extend({
  blockSpecs: { mathBlock: createReactMathBlockSpec() },
  inlineContentSpecs: { math: createReactInlineMathSpec() },
});
const createEditor = (initialContent?: DocumentContent) =>
  BlockNoteEditor.create({
    schema,
    ...(initialContent ? { initialContent: initialContent as never } : {}),
  });

/**
 * The real BlockNote 0.56 editor with the document schema, on happy-dom, for the calling test file.
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
    /** Opens the blocks in a new editor, as reopening the document does; both sides must be a valid document. */
    reload(blocks: DocumentContent): DocumentContent {
      readDocumentContent(blocks, {}, { embeds: true });
      const reloaded = createEditor(blocks);
      const result = reloaded.document as unknown as DocumentContent;
      readDocumentContent(result, {}, { embeds: true });
      reloaded._tiptapEditor.destroy();
      return result;
    },
  };
}
