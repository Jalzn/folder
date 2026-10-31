import { MathInlineInputRulesExtension } from '@blocknote/math-block';
import { useCreateBlockNote } from '@blocknote/react';
import { useSearch } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import type { AutosaveController, SaveState } from '../../lib/autosave';
import type { Document } from '../../lib/types';
import { documentDictionary, documentSchema, type EditorBlocks } from './document-schema';
import { documentSnapshot } from './document-session';

/**
 * The BlockNote editor of a document, started from the draft or the saved content. A newer version taken
 * from elsewhere (a reload or an adopted remote save) replaces the blocks.
 */
export function useDocumentEditor(controller: AutosaveController, document: Document, state: SaveState) {
  const initial = useRef(state.snapshot.content);
  const editor = useCreateBlockNote({
    schema: documentSchema,
    // BlockNote 0.56 registers block-spec extensions, but not inline-spec extensions.
    extensions: [MathInlineInputRulesExtension],
    dictionary: documentDictionary,
    ...(initial.current.length ? { initialContent: initial.current as unknown as EditorBlocks } : {}),
    domAttributes: { editor: { 'aria-label': 'Conteúdo do documento', 'data-testid': 'document-content' } },
  });
  const lastEpoch = useRef(state.remoteEpoch);
  useEffect(() => {
    controller.receiveRemote(documentSnapshot(document), document.version);
  }, [controller, document]);
  useEffect(() => {
    if (lastEpoch.current === state.remoteEpoch) return;
    lastEpoch.current = state.remoteEpoch;
    editor.replaceBlocks(
      editor.document,
      state.snapshot.content.length ? (state.snapshot.content as unknown as EditorBlocks) : [{ type: 'paragraph' }],
    );
  }, [editor, state.remoteEpoch, state.snapshot.content]);
  return editor;
}

/**
 * `?bloco=` places the cursor at the start of that block, the excerpt a task came from. When the block is
 * gone, the page says so until dismissed.
 */
export function useBlockAnchor(editor: ReturnType<typeof useDocumentEditor>) {
  const search = useSearch({ strict: false });
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (!search.bloco) return;
    try {
      const block = editor.getBlock(search.bloco);
      if (!block) {
        setMissing(true);
        return;
      }
      editor.setTextCursorPosition(block.id, 'start');
      editor.focus();
      setMissing(false);
    } catch {
      setMissing(true);
    }
  }, [editor, search.bloco]);
  return { missing, dismiss: () => setMissing(false) };
}
