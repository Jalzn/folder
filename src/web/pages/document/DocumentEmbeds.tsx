import type { EmbedKind } from '@tinyfold/workspace/domain';
import { type ReactNode, type RefObject, useMemo, useRef, useState } from 'react';
import { type EmbedText, embedText } from '../../editor/blocks/embed-text';
import { EmbedsProvider, type EmbedsValue } from '../../editor/blocks/embeds-context';
import { EmbedPicker } from '../../editor/EmbedPicker';
import { embedSlashItems } from '../../editor/insert-menu';
import type { BlockEditorInstance } from '../../editor/use-block-editor';
import { useColumns } from '../../lib/queries';
import { useCommandSlot } from '../../lib/react/use-command-slot';
import { useStableHandlers } from '../../lib/react/use-stable-handlers';
import { useOpenTaskId, useOwnerToday } from '../../shell';
import { useDocumentEmbeds } from './use-document-embeds';
import { useEmbedActions } from './use-embed-actions';
import { useEmbedPreviews } from './use-embed-preview';

/**
 * What the document's page asks of its embeds: ⌘K's "Incorporar…", "Incorporar no documento", and ⌫ and ⌘C on
 * one.
 */
export interface EmbedCommands {
  /** Opens the picker on the block of the text cursor, as the `/` menu does. */
  openPicker: (kind: EmbedKind) => void;
  /** Puts a task's card right after a block; false when the block is gone. */
  insertTaskAfter: (blockId: string, taskId: string) => boolean;
  /** "Remover" of an embed's block, with Desfazer, as ⌫ and Delete take a selected embed out. */
  remove: (blockId: string) => void;
  /** A copied embed's words and link, from the item as the document resolved it. */
  describe: (kind: EmbedKind, id: string) => EmbedText;
}

/**
 * What the picker hangs from: the line of a block as the editor draws it now, or else the editor itself. React
 * Aria reads it at each placement, as the picker's list loads and the window changes, and an element kept from
 * when the `/` was typed may be gone by then: when the editor's view is made anew, as a hot update of the dev
 * server makes it, every block is a new element. A detached element measures 0 × 0, and the picker went to the
 * window's top-left corner (found after the merge of stage 11). Null only with no editor on the page.
 */
function pickerAnchor(editor: BlockEditorInstance, blockId: string | null): HTMLElement | null {
  let root: HTMLElement | undefined;
  try {
    root = editor.domElement;
  } catch {
    return null;
  }
  if (!root?.isConnected) return null;
  const line = blockId ? root.querySelector<HTMLElement>(`[data-id="${CSS.escape(blockId)}"] .bn-block-content`) : null;
  return line?.isConnected ? line : root;
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
  const today = useOwnerToday();
  const [picker, setPicker] = useState<{ kind: EmbedKind; blockId: string } | null>(null);
  /** The block the picker was opened on, which it hangs from (pickerAnchor), found again at each read. */
  const pickerBlock = useRef<string | null>(null);
  const anchor = useMemo<RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        return pickerAnchor(editor, pickerBlock.current);
      },
    }),
    [editor],
  );
  const openTaskId = useOpenTaskId();
  const board = useColumns().data?.columns;
  const columns = useMemo(() => board?.map((column) => column.id) ?? [], [board]);
  const value = useMemo<EmbedsValue>(
    () => ({ ...states, previews, columns, documentProjectId: projectId, today, openTaskId, readOnly, actions }),
    [states, previews, columns, projectId, today, openTaskId, readOnly, actions],
  );
  /** The picker on the block of the text cursor, which it hangs from; nothing with no editor on the page. */
  function openPicker(kind: EmbedKind) {
    const block = editor.getTextCursorPosition().block;
    if (!pickerAnchor(editor, block.id)) return;
    pickerBlock.current = block.id;
    setPicker({ kind, blockId: block.id });
  }
  const offered = useStableHandlers<EmbedCommands>({
    openPicker,
    insertTaskAfter: (blockId, taskId) => Boolean(editor.getBlock(blockId)) && insert(blockId, 'task', taskId),
    remove: (blockId) => actions.remove(blockId),
    describe: (kind, id) => {
      const { tasks, drawings } = states;
      return embedText(kind, id, kind === 'task' ? tasks.get(id) : drawings.get(id), window.location.origin);
    },
  });
  useCommandSlot(commands, offered, null);
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
