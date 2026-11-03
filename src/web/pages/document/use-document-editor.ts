import { useSearch } from '@tanstack/react-router';
import { type RefObject, useEffect, useRef, useState } from 'react';
import { createEmbedKeys, type EmbedKeyActions } from '../../editor/blocks/embed-keys';
import { embedText } from '../../editor/blocks/embed-text';
import { createOriginMarkers } from '../../editor/origin-markers';
import { type BlockEditorInstance, useBlockEditor } from '../../editor/use-block-editor';
import type { AutosaveController, SaveState, Snapshot } from '../../lib/autosave';
import { lacksBlockIds } from '../../lib/files/block-ids';
import { sanitizeEmbeds } from '../../lib/files/sanitize-embeds';
import type { Document, DocumentContent } from '../../lib/types';
import { documentSnapshot } from './document-session';

/**
 * The editor's blocks as the document keeps and saves them: nothing nested under an embed, and no embed with
 * an ID the server refuses (sanitizeEmbeds). The keys and the paste keep both out; this is the net under them.
 */
export const savedContent = (editor: BlockEditorInstance) =>
  sanitizeEmbeds(editor.document as unknown as DocumentContent);

/**
 * The BlockNote editor of a document, started from the draft or the saved content, with its origin markers,
 * which open their task through `openOrigin`, and the keys of its embeds, which take one out and copy one
 * through `embedActions` once the page has them. A newer version taken from elsewhere (a reload or an adopted remote
 * save) replaces the blocks.
 */
export function useDocumentEditor(
  controller: AutosaveController<Snapshot>,
  document: Document,
  state: SaveState<Snapshot>,
  openOrigin: RefObject<(taskId: string) => void>,
  embedActions: RefObject<EmbedKeyActions | null>,
) {
  const [extensions] = useState(() => [
    createOriginMarkers((taskId) => openOrigin.current(taskId)),
    createEmbedKeys({
      remove: (blockId) => embedActions.current?.remove(blockId),
      describe: (kind, id) =>
        embedActions.current?.describe(kind, id) ?? embedText(kind, id, undefined, window.location.origin),
    }),
  ]);
  const editor = useBlockEditor({
    extensions,
    schema: 'document',
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
      controller.change({ ...controller.getState().snapshot, content: savedContent(editor) });
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
