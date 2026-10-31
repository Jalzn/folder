import type { BlockNoteEditor } from '@blocknote/core';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { api, errorMessage, queryClient, refreshWorkspace } from '../../lib/api';
import type { AutosaveController } from '../../lib/autosave';
import type { Document } from '../../lib/types';
import { useAction } from '../../lib/use-action';
import { useRequest } from '../../lib/use-request';
import { paths } from '../../router/paths';
import { redirectedCopyText, useApp, useCopyDestination } from '../../shell';
import { useToast } from '../../ui';
import { documentSnapshot } from './document-session';

/** The text selected in the editor, as plain text. */
// biome-ignore lint/suspicious/noExplicitAny: BlockNote's editor type depends on the schema's generics.
export function selectedText(editor: BlockNoteEditor<any, any, any>) {
  const { doc, selection } = editor.prosemirrorState;
  return doc.textBetween(selection.from, selection.to, '\n').trim();
}

/**
 * What the document page does besides typing: a task from the selection, taking the saved version in a
 * conflict, saving the draft as a copy, and moving the document to the trash.
 */
export function useDocumentActions(
  // biome-ignore lint/suspicious/noExplicitAny: BlockNote's editor type depends on the schema's generics.
  editor: BlockNoteEditor<any, any, any>,
  controller: AutosaveController,
  document: Document,
  onTaskClosed: () => void,
) {
  const app = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const action = useAction();
  const trashRequest = useRequest();
  const copyRequest = useRequest();
  const findDestination = useCopyDestination();
  const [preparingTask, setPreparingTask] = useState(false);
  const [copying, setCopying] = useState(false);

  async function createTaskFromSelection() {
    const text = selectedText(editor);
    if (!text) {
      toast('Selecione um trecho do documento para criar uma tarefa.', 'error');
      return;
    }
    const blocks = editor.getSelection()?.blocks;
    const blockId = blocks && blocks.length > 1 ? null : (blocks?.[0]?.id ?? editor.getTextCursorPosition().block.id);
    setPreparingTask(true);
    const saved = await controller.flush();
    setPreparingTask(false);
    if (!saved || controller.getState().status !== 'saved') {
      toast('Salve ou resolva o conflito do documento antes de criar a tarefa.', 'error');
      return;
    }
    const projectId = controller.getState().snapshot.projectId ?? document.projectId;
    if (!projectId) return;
    const excerpt = text.slice(0, 4000);
    app.newTask(projectId, {
      source: { documentId: document.id, blockId, excerpt, expectedVersion: controller.getState().version },
      title: excerpt.slice(0, 300),
      onClose: onTaskClosed,
    });
  }

  async function reloadRemote() {
    try {
      const current = await api.workspace.getDocument({ id: document.id });
      controller.acceptRemote(documentSnapshot(current), current.version);
      queryClient.setQueryData(['workspace', 'document', document.id], current);
      toast('Versão salva carregada.');
      return true;
    } catch (error) {
      toast(errorMessage(error), 'error');
      return false;
    }
  }

  async function saveCopy() {
    if (copying) return;
    setCopying(true);
    const current = controller.getState().snapshot;
    try {
      const { destination, projects } = await findDestination(current.projectId);
      if (!destination) {
        toast('Crie ou desarquive um projeto para salvar a cópia.', 'error');
        return;
      }
      const input = {
        ...current,
        projectId: destination.project.id,
        title: `${current.title || 'Sem título'} — cópia`.slice(0, 300),
      };
      const copy = await api.workspace.createDocument({ ...input, requestId: copyRequest.for(input) });
      copyRequest.clear();
      // The copy is already safe, even if the original was trashed on another device.
      try {
        const original = await api.workspace.getDocument({ id: document.id });
        controller.acceptRemote(documentSnapshot(original), original.version);
      } catch {
        /* Keep the local draft; opening the acknowledged copy must still succeed. */
      }
      await refreshWorkspace();
      toast(
        destination.redirected
          ? redirectedCopyText(destination.project.name, projects.find((p) => p.id === current.projectId)?.name)
          : 'Seu rascunho foi salvo em um novo documento.',
      );
      void navigate({ href: paths.document(destination.project.id, copy.id) });
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setCopying(false);
    }
  }

  async function moveToTrash() {
    if (!(await controller.flush())) {
      toast('Resolva o salvamento antes de mover o documento para a lixeira.', 'error');
      return false;
    }
    const input = { id: document.id, expectedVersion: controller.getState().version };
    const done = await action.run(
      () => api.workspace.deleteDocument({ ...input, requestId: trashRequest.for(input) }),
      () => {
        trashRequest.clear();
        toast('Documento movido para a lixeira.');
        void navigate({ href: document.projectId ? paths.overview(document.projectId) : paths.start });
      },
    );
    return done !== undefined;
  }

  return {
    createTaskFromSelection,
    preparingTask,
    reloadRemote,
    saveCopy,
    copying,
    moveToTrash,
    trashing: action.busy,
  };
}
