import { type ReactNode, type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { EmbedsProvider, type EmbedsValue } from '../../editor/blocks/embeds-context';
import { EmbedPicker } from '../../editor/EmbedPicker';
import { type EmbedKind, embedSlashItems } from '../../editor/insert-menu';
import type { BlockEditorInstance } from '../../editor/use-block-editor';
import { useDrawerContent } from '../../shell';
import { useOwnerToday } from '../../shell/AppProvider';
import { useDocumentEmbeds } from './use-document-embeds';
import { useEmbedActions } from './use-embed-actions';
import { useEmbedPreviews } from './use-embed-preview';

/** What the document's page asks of its embeds: ⌘K's "Incorporar…", "Incorporar no documento" and ⌫ on one. */
export interface EmbedCommands {
  /** Opens the picker on the block of the text cursor, as the `/` menu does. */
  openPicker: (kind: EmbedKind) => void;
  /** Puts a task's card right after a block; false when the block is gone. */
  insertTaskAfter: (blockId: string, taskId: string) => boolean;
  /** "Remover" of an embed's block, with Desfazer, as ⌫ and Delete take a selected embed out. */
  remove: (blockId: string) => void;
}

/**
 * A document's embeds around its editor (docs/etapas/11-documento-desenho.md, "Interface"): the provider the
 * blocks read their states and actions from, the "Incorporar" items of the `/` menu and the picker they open.
 * `children` gets the slash items, none in a document that only reads.
 */
export function DocumentEmbeds({
  editor,
  documentId,
  projectId,
  folderId,
  readOnly,
  commands,
  children,
}: {
  editor: BlockEditorInstance;
  documentId: string;
  projectId: string;
  folderId: string | null;
  readOnly: boolean;
  commands: RefObject<EmbedCommands | null>;
  children: (slashItems: ReturnType<typeof embedSlashItems> | undefined) => ReactNode;
}) {
  const states = useDocumentEmbeds(documentId, editor);
  const previews = useEmbedPreviews(states.drawings);
  const { actions, insert, newTask, newDrawing } = useEmbedActions({ editor, documentId, projectId, folderId });
  const content = useDrawerContent();
  const today = useOwnerToday();
  const [picker, setPicker] = useState<{ kind: EmbedKind; blockId: string } | null>(null);
  /** The block the `/` was typed in, which the picker hangs from. */
  const anchor = useRef<HTMLElement | null>(null);
  const openTaskId = content?.mode === 'task' ? content.id : null;
  const value = useMemo<EmbedsValue>(
    () => ({ ...states, previews, documentProjectId: projectId, today, openTaskId, readOnly, actions }),
    [states, previews, projectId, today, openTaskId, readOnly, actions],
  );
  /** The picker on the block of the text cursor, which it hangs from. */
  function openPicker(kind: EmbedKind) {
    const block = editor.getTextCursorPosition().block;
    anchor.current = editor.domElement?.querySelector<HTMLElement>(`[data-id="${CSS.escape(block.id)}"]`) ?? null;
    setPicker({ kind, blockId: block.id });
  }
  const latest = useRef({ openPicker, insert });
  latest.current = { openPicker, insert };
  useEffect(() => {
    commands.current = {
      openPicker: (kind) => latest.current.openPicker(kind),
      insertTaskAfter: (blockId, taskId) =>
        Boolean(editor.getBlock(blockId)) && latest.current.insert(blockId, 'task', taskId),
      remove: (blockId) => actions.remove(blockId),
    };
    return () => {
      commands.current = null;
    };
  }, [commands, editor, actions]);
  const slashItems = readOnly ? undefined : embedSlashItems(openPicker);
  /** Esc in the picker: the cursor goes back to the block. */
  function back(blockId: string) {
    if (editor.getBlock(blockId)) editor.setTextCursorPosition(blockId, 'end');
    editor.focus();
  }
  return (
    <EmbedsProvider value={value}>
      {children(slashItems)}
      {picker && (
        <EmbedPicker
          kind={picker.kind}
          projectId={projectId}
          triggerRef={anchor}
          onClose={() => {
            setPicker(null);
            back(picker.blockId);
          }}
          onNew={(title) => {
            setPicker(null);
            if (picker.kind === 'task') newTask(picker.blockId, title);
            else void newDrawing(picker.blockId, title);
          }}
          onPick={(item) => {
            setPicker(null);
            insert(picker.blockId, picker.kind, item.id);
          }}
        />
      )}
    </EmbedsProvider>
  );
}
