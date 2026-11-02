import { useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import type { EmbedActions } from '../../editor/blocks/embeds-context';
import type { EmbedKind } from '../../editor/insert-menu';
import type { BlockEditorInstance } from '../../editor/use-block-editor';
import { api } from '../../lib/api';
import { inFolderOrRoot } from '../../lib/folder-fallback';
import { onceMoreIfLost } from '../../lib/lost-answer';
import { useAction } from '../../lib/use-action';
import { useRequest } from '../../lib/use-request';
import { paths } from '../../router/paths';
import { useTaskDrawer } from '../../shell';
import { useToast } from '../../ui';
import { putBackRemoved } from './embed-removal';

type Block = ReturnType<BlockEditorInstance['getBlock']> & {};

const blockOf = (kind: EmbedKind, id: string) =>
  kind === 'task'
    ? ({ type: 'taskEmbed', props: { taskId: id } } as const)
    : ({ type: 'drawingEmbed', props: { canvasId: id } } as const);

/** An empty paragraph, which the `/` leaves behind and an embed takes the place of. */
const isEmptyParagraph = (block: Block) =>
  block.type === 'paragraph' && Array.isArray(block.content) && block.content.length === 0 && !block.children.length;

/**
 * What the document does with its embeds (docs/etapas/11-documento-desenho.md, "Interface"): insert one where
 * the `/` was, open its item, create a task or a drawing to embed, put an item back from the trash, and remove
 * a block with Desfazer. The focus moves through the editor's API, never by a selector.
 */
export function useEmbedActions({
  editor,
  documentId,
  projectId,
  folderId,
}: {
  editor: BlockEditorInstance;
  documentId: string;
  projectId: string;
  folderId: string | null;
}) {
  const drawer = useTaskDrawer();
  const navigate = useNavigate();
  const toast = useToast();
  const action = useAction();
  const restoreRequest = useRequest();
  const canvasRequest = useRequest();

  /**
   * A block's index at the document's top level; a nested one counts as right after its top-level ancestor,
   * where Desfazer can put it back when the block before it is gone.
   */
  function topIndex(blockId: string) {
    let top = blockId;
    for (let parent = editor.getParentBlock(top); parent; parent = editor.getParentBlock(top)) top = parent.id;
    const index = editor.document.findIndex((block) => block.id === top);
    return top === blockId ? index : index + 1;
  }

  /** The editor is still on the page: a task created after the document closed does not reach it. */
  const present = () => Boolean(editor.domElement?.isConnected);

  /** Puts an embed in place of the empty paragraph `at`, or right after it, and selects it. */
  function insert(at: string | null, kind: EmbedKind, id: string) {
    if (!present()) return false;
    const reference = (at && editor.getBlock(at)) || editor.document.at(-1);
    if (!reference) return false;
    const embed = blockOf(kind, id);
    const [inserted] = isEmptyParagraph(reference)
      ? editor.replaceBlocks([reference], [embed]).insertedBlocks
      : editor.insertBlocks([embed], reference, 'after');
    if (!inserted) return false;
    // A last embed gets a paragraph after it, where the writing goes on.
    if (!editor.getNextBlock(inserted)) editor.insertBlocks([{ type: 'paragraph' }], inserted, 'after');
    editor.setTextCursorPosition(inserted);
    editor.focus();
    return true;
  }

  /**
   * "Nova tarefa…": the drawer's new task, in the document's project, titled with what the picker's field had;
   * the card goes in place once it is created.
   */
  function newTask(at: string | null, title = '') {
    drawer.newTask(projectId, { ...(title ? { title } : {}), onCreated: (task) => insert(at, 'task', task.id) });
  }

  /** "Novo desenho": a drawing in the document's project and folder, titled as the field had, embedded at once. */
  async function newDrawing(at: string | null, title = '') {
    const input = { projectId, ...(folderId ? { folderId } : {}), ...(title ? { title } : {}) };
    await action.run(
      () =>
        inFolderOrRoot(folderId ?? undefined, (folder) => {
          const attempt = { projectId, ...(folder ? { folderId: folder } : {}), ...(title ? { title } : {}) };
          return onceMoreIfLost(() =>
            api.workspace.createCanvas({ ...attempt, requestId: canvasRequest.for({ documentId, ...input }) }),
          );
        }),
      ({ created }) => {
        canvasRequest.clear();
        insert(at, 'drawing', created.id);
        toast('Desenho criado e incorporado.', {
          action: { label: 'Abrir', onAction: () => void navigate({ href: paths.drawing(projectId, created.id) }) },
        });
      },
    );
  }

  const current: EmbedActions = {
    openTask: (task) => drawer.openTask({ id: task.id, projectId: task.project.id, title: task.title }),
    openDrawing: (drawing) => void navigate({ href: paths.drawing(drawing.project.id, drawing.id) }),
    restore: (kind, item, blockId) => {
      const input = { id: item.id, expectedVersion: item.version };
      const requestId = restoreRequest.for({ kind, ...input });
      // The button goes with the box it was in: the focus goes to the block, selected as the card or figure
      // it becomes (review M2), never to the page.
      const restored = (open: () => void) => {
        restoreRequest.clear();
        if (present() && editor.getBlock(blockId)) {
          editor.setTextCursorPosition(blockId);
          editor.focus();
        }
        toast(`“${item.title}” restaurado.`, { action: { label: 'Abrir', onAction: open } });
      };
      if (kind === 'task')
        void action.run(
          () => onceMoreIfLost(() => api.workspace.restoreTask({ ...input, requestId })),
          (ack) => restored(() => drawer.openTask({ id: ack.id, projectId: ack.projectId, title: item.title })),
        );
      else
        void action.run(
          () => onceMoreIfLost(() => api.workspace.restoreCanvas({ ...input, requestId })),
          // The drawing's permanent address finds its project.
          () => restored(() => void navigate({ href: `/desenhos/${encodeURIComponent(item.id)}` })),
        );
    },
    remove: (blockId) => {
      const block = editor.getBlock(blockId);
      if (!block) return;
      const where = { previousId: editor.getPrevBlock(blockId)?.id ?? null, index: topIndex(blockId) };
      const next = editor.getNextBlock(blockId) ?? editor.getPrevBlock(blockId);
      editor.removeBlocks([blockId]);
      if (next) editor.setTextCursorPosition(next, 'start');
      editor.focus();
      toast('Bloco removido do documento. O texto ao redor ficou como estava.', {
        undo: () => {
          if (!present()) return;
          const back = putBackRemoved(
            {
              has: (id) => Boolean(editor.getBlock(id)),
              insertAfter: (removed, referenceId) => editor.insertBlocks([removed], referenceId, 'after'),
              insertAt: (removed, index) => {
                const blocks = editor.document;
                const at = blocks[index];
                const last = blocks.at(-1);
                if (at) editor.insertBlocks([removed], at, 'before');
                else if (last) editor.insertBlocks([removed], last, 'after');
              },
            },
            block,
            where,
          );
          if (back) editor.setTextCursorPosition(block.id);
          editor.focus();
        },
      });
    },
  };
  // The blocks get one object for the editor's life, which calls this render's actions: a keystroke in the text
  // renders the page again, and must not render every embed with it.
  const latest = useRef(current);
  latest.current = current;
  const [actions] = useState<EmbedActions>(() => ({
    openTask: (task) => latest.current.openTask(task),
    openDrawing: (drawing) => latest.current.openDrawing(drawing),
    restore: (kind, item, blockId) => latest.current.restore(kind, item, blockId),
    remove: (blockId) => latest.current.remove(blockId),
  }));
  return { actions, insert, newTask, newDrawing };
}
