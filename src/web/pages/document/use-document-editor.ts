import { useSearch } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { type BlockEditorInstance, useBlockEditor } from '../../editor/use-block-editor';
import type { AutosaveController, SaveState } from '../../lib/autosave';
import { lacksBlockIds } from '../../lib/block-ids';
import type { Document, DocumentContent } from '../../lib/types';
import { documentSnapshot } from './document-session';

/**
 * The BlockNote editor of a document, started from the draft or the saved content. A newer version taken
 * from elsewhere (a reload or an adopted remote save) replaces the blocks.
 */
export function useDocumentEditor(controller: AutosaveController, document: Document, state: SaveState) {
  const editor = useBlockEditor({
    initial: state.snapshot.content,
    epoch: state.remoteEpoch,
    content: state.snapshot.content,
    label: 'Conteúdo do documento',
    testId: 'document-content',
  });
  useEffect(() => {
    controller.receiveRemote(documentSnapshot(document), document.version);
  }, [controller, document]);
  // A document stored before every block had an id is saved once with the editor's ids, so a task made
  // from a selection points at a block the server has.
  const idsChecked = useRef(false);
  useEffect(() => {
    if (idsChecked.current) return;
    idsChecked.current = true;
    if (lacksBlockIds(document.content))
      controller.change({ ...controller.getState().snapshot, content: editor.document as unknown as DocumentContent });
  }, [controller, document, editor]);
  return editor;
}

/**
 * `?bloco=` places the cursor at the start of that block, the excerpt a task came from. When the block is
 * gone, the page says so until dismissed.
 */
export function useBlockAnchor(editor: BlockEditorInstance) {
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
