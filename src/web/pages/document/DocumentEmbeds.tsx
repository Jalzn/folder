import { type ReactNode, useMemo, useRef, useState } from 'react';
import { EmbedsProvider, type EmbedsValue } from '../../editor/blocks/embeds-context';
import { EmbedPicker } from '../../editor/EmbedPicker';
import { type EmbedKind, embedSlashItems } from '../../editor/insert-menu';
import type { BlockEditorInstance } from '../../editor/use-block-editor';
import { useDrawerContent } from '../../shell';
import { useOwnerToday } from '../../shell/AppProvider';
import { useDocumentEmbeds } from './use-document-embeds';
import { useEmbedActions } from './use-embed-actions';
import { useEmbedPreviews } from './use-embed-preview';

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
  children,
}: {
  editor: BlockEditorInstance;
  documentId: string;
  projectId: string;
  folderId: string | null;
  readOnly: boolean;
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
  const slashItems = readOnly
    ? undefined
    : embedSlashItems((kind) => {
        const block = editor.getTextCursorPosition().block;
        anchor.current = editor.domElement?.querySelector<HTMLElement>(`[data-id="${CSS.escape(block.id)}"]`) ?? null;
        setPicker({ kind, blockId: block.id });
      });
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
          onNew={() => {
            setPicker(null);
            if (picker.kind === 'task') newTask(picker.blockId);
            else void newDrawing(picker.blockId);
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
