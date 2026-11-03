import { useState } from 'react';
import type { AnyBlockEditor } from '../../editor/types';
import type { AutosaveController, Snapshot } from '../../lib/autosave';
import { type Document, displayTitle } from '../../lib/types';
import { useTaskDrawer } from '../../shell';
import { useToast } from '../../ui';

/** What ⌘⌥T and "Criar tarefa" say without an excerpt to take. */
export const NO_EXCERPT = 'Selecione um trecho do documento primeiro.';

/** The text selected in the editor, as plain text. */
export function selectedText(editor: AnyBlockEditor) {
  const { doc, selection } = editor.prosemirrorState;
  return doc.textBetween(selection.from, selection.to, '\n').trim();
}

/**
 * "Criar tarefa da seleção": saves the document first, so the task points at the version that has the
 * excerpt, then opens the drawer on a new task with the excerpt as its origin and title.
 */
export function useTaskFromSelection(
  editor: AnyBlockEditor,
  controller: AutosaveController<Snapshot>,
  document: Document,
) {
  const drawer = useTaskDrawer();
  const toast = useToast();
  const [preparing, setPreparing] = useState(false);

  async function create() {
    const text = selectedText(editor);
    if (!text) {
      toast(NO_EXCERPT);
      return;
    }
    const blocks = editor.getSelection()?.blocks;
    const cursor = editor.getTextCursorPosition().block.id;
    const blockId = blocks && blocks.length > 1 ? null : (blocks?.[0]?.id ?? cursor);
    // The card of "Incorporar no documento" goes after the excerpt's last block.
    const embedAfter = blocks?.at(-1)?.id ?? cursor;
    setPreparing(true);
    const saved = await controller.flush();
    setPreparing(false);
    if (!saved || controller.getState().status !== 'saved') {
      toast('Salve ou resolva o conflito do documento antes de criar a tarefa.', 'error');
      return;
    }
    const excerpt = text.slice(0, 4000);
    const { projectId, title } = controller.getState().snapshot;
    drawer.newTask(projectId, {
      source: {
        documentId: document.id,
        documentTitle: displayTitle(title),
        blockId,
        excerpt,
        expectedVersion: controller.getState().version,
      },
      title: excerpt.slice(0, 300),
      embedAfter,
    });
  }

  return { create, preparing };
}
