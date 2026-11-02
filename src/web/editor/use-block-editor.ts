import type { ExtensionFactoryInstance } from '@blocknote/core';
import { MathInlineInputRulesExtension } from '@blocknote/math-block';
import { useCreateBlockNote } from '@blocknote/react';
import { useEffect, useRef } from 'react';
import type { DocumentContent } from '../lib/types';
import { EMBED_CLIPBOARD_MARK } from './blocks/embed-blocks';
import {
  descriptionSchema,
  documentDictionary,
  documentSchema,
  type EditorBlocks,
  type EditorSchemaKind,
} from './schema';

/**
 * A paste in a task's description, which has no embeds (decision 2): cards and figures copied from a document
 * come in as the links other apps get (review B3), from the clipboard's HTML, never as nothing.
 */
function pasteInDescription({
  event,
  editor,
  defaultPasteHandler,
}: {
  event: ClipboardEvent;
  editor: { pasteHTML: (html: string) => void };
  defaultPasteHandler: () => boolean | undefined;
}) {
  const html = event.clipboardData?.getData('text/html');
  if (!html || !EMBED_CLIPBOARD_MARK.test(event.clipboardData?.getData('blocknote/html') ?? ''))
    return defaultPasteHandler();
  editor.pasteHTML(html);
  return true;
}

/**
 * A BlockNote editor of a document or of a task's description (`schema`), started from `initial`. Each new `epoch`, a newer version taken
 * from elsewhere (a reload or an adopted remote save), replaces the blocks with `content`.
 */
export function useBlockEditor({
  schema,
  initial,
  epoch,
  content,
  label,
  placeholder,
  testId,
  extensions = [],
}: {
  /** A document takes embeds; a description does not. */
  schema: EditorSchemaKind;
  initial: DocumentContent;
  epoch: number;
  content: DocumentContent;
  /** The editable area's accessible name, as "Conteúdo do documento". */
  label: string;
  /** The empty editor's hint, instead of the document's. */
  placeholder?: string;
  testId?: string;
  /** More BlockNote extensions, as the document's origin markers; read once, when the editor is made. */
  extensions?: readonly ExtensionFactoryInstance[];
}) {
  const start = useRef(initial);
  const added = useRef(extensions);
  const editor = useCreateBlockNote({
    // The kind never changes for an editor, so neither does the schema it was made with. Typed as the
    // document's, the larger of the two: a description's blocks are a subset of it.
    schema: (schema === 'document' ? documentSchema : descriptionSchema) as typeof documentSchema,
    // BlockNote 0.56 registers block-spec extensions, but not inline-spec extensions.
    extensions: [MathInlineInputRulesExtension, ...added.current],
    dictionary: placeholder
      ? {
          ...documentDictionary,
          placeholders: { ...documentDictionary.placeholders, default: placeholder, emptyDocument: placeholder },
        }
      : documentDictionary,
    ...(start.current.length ? { initialContent: start.current as unknown as EditorBlocks } : {}),
    domAttributes: { editor: { 'aria-label': label, ...(testId ? { 'data-testid': testId } : {}) } },
    ...(schema === 'description' ? { pasteHandler: pasteInDescription } : {}),
  });
  const lastEpoch = useRef(epoch);
  useEffect(() => {
    if (lastEpoch.current === epoch) return;
    lastEpoch.current = epoch;
    editor.replaceBlocks(
      editor.document,
      content.length ? (content as unknown as EditorBlocks) : [{ type: 'paragraph' }],
    );
  }, [editor, epoch, content]);
  return editor;
}

export type BlockEditorInstance = ReturnType<typeof useBlockEditor>;
