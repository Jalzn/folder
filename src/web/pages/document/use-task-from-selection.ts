import type { BlockNoteEditor } from '@blocknote/core';
import { useState } from 'react';
import type { AutosaveController } from '../../lib/autosave';
import type { Document } from '../../lib/types';
import { useApp } from '../../shell';
import { useToast } from '../../ui';

/** The text selected in the editor, as plain text. */
// biome-ignore lint/suspicious/noExplicitAny: BlockNote's editor type depends on the schema's generics.
export function selectedText(editor: BlockNoteEditor<any, any, any>) {
  const { doc, selection } = editor.prosemirrorState;
  return doc.textBetween(selection.from, selection.to, '\n').trim();
}

/**
 * "Criar tarefa da seleção": saves the document first, so the task points at the version that has the
 * excerpt, then opens the task dialog with the excerpt as its origin and title.
 */
export function useTaskFromSelection(
  // biome-ignore lint/suspicious/noExplicitAny: BlockNote's editor type depends on the schema's generics.
  editor: BlockNoteEditor<any, any, any>,
  controller: AutosaveController,
  document: Document,
  onTaskClosed: () => void,
) {
  const app = useApp();
  const toast = useToast();
  const [preparing, setPreparing] = useState(false);

  async function create() {
    const text = selectedText(editor);
    if (!text) {
      toast('Selecione um trecho do documento para criar uma tarefa.', 'error');
      return;
    }
    const blocks = editor.getSelection()?.blocks;
    const blockId = blocks && blocks.length > 1 ? null : (blocks?.[0]?.id ?? editor.getTextCursorPosition().block.id);
    setPreparing(true);
    const saved = await controller.flush();
    setPreparing(false);
    if (!saved || controller.getState().status !== 'saved') {
      toast('Salve ou resolva o conflito do documento antes de criar a tarefa.', 'error');
      return;
    }
    const excerpt = text.slice(0, 4000);
    app.newTask(controller.getState().snapshot.projectId ?? document.projectId, {
      source: { documentId: document.id, blockId, excerpt, expectedVersion: controller.getState().version },
      title: excerpt.slice(0, 300),
      onClose: onTaskClosed,
    });
  }

  return { create, preparing };
}
