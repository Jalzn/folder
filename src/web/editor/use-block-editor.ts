import { MathInlineInputRulesExtension } from '@blocknote/math-block';
import { useCreateBlockNote } from '@blocknote/react';
import { useEffect, useRef } from 'react';
import type { DocumentContent } from '../lib/types';
import { documentDictionary, documentSchema, type EditorBlocks } from './schema';

/**
 * A BlockNote editor of the shared schema, started from `initial`. Each new `epoch`, a newer version taken
 * from elsewhere (a reload or an adopted remote save), replaces the blocks with `content`.
 */
export function useBlockEditor({
  initial,
  epoch,
  content,
  label,
  placeholder,
  testId,
}: {
  initial: DocumentContent;
  epoch: number;
  content: DocumentContent;
  /** The editable area's accessible name, as "Conteúdo do documento". */
  label: string;
  /** The empty editor's hint, instead of the document's. */
  placeholder?: string;
  testId?: string;
}) {
  const start = useRef(initial);
  const editor = useCreateBlockNote({
    schema: documentSchema,
    // BlockNote 0.56 registers block-spec extensions, but not inline-spec extensions.
    extensions: [MathInlineInputRulesExtension],
    dictionary: placeholder
      ? {
          ...documentDictionary,
          placeholders: { ...documentDictionary.placeholders, default: placeholder, emptyDocument: placeholder },
        }
      : documentDictionary,
    ...(start.current.length ? { initialContent: start.current as unknown as EditorBlocks } : {}),
    domAttributes: { editor: { 'aria-label': label, ...(testId ? { 'data-testid': testId } : {}) } },
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
