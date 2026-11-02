import { type RefObject, useLayoutEffect } from 'react';
import type { BlockEditorInstance } from '../../editor/use-block-editor';
import { useApp } from '../../shell';

/**
 * Text typed after ↵ while the document was on its way, as ↵ in the title takes the caret: at the start of the
 * content, a paragraph for each line.
 */
function typeAtStart(editor: BlockEditorInstance, text: string) {
  const [first = '', ...more] = text.split('\n');
  const start = editor.document[0];
  if (!start) return;
  editor.setTextCursorPosition(start, 'start');
  editor.focus();
  if (first) editor.insertInlineContent(first);
  let at = editor.getTextCursorPosition().block.id;
  for (const line of more) {
    const [next] = editor.insertBlocks([{ type: 'paragraph', content: line }], at, 'after');
    if (!next) return;
    at = next.id;
    editor.setTextCursorPosition(at, 'end');
  }
}

/**
 * The page of a document "Novo documento" just made, by any path: as it opens, its title takes the focus and
 * what was typed while it was on its way (AppProvider's newDocumentOpened).
 */
export function useNewDocument(
  documentId: string,
  editor: BlockEditorInstance,
  title: RefObject<HTMLTextAreaElement | null>,
) {
  const { newDocumentOpened } = useApp();
  useLayoutEffect(() => {
    if (title.current)
      newDocumentOpened(documentId, { title: title.current, toContent: (text) => typeAtStart(editor, text) });
  }, [documentId, editor, title, newDocumentOpened]);
}
