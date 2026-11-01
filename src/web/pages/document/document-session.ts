import type { ItemAdapter } from '../../components/editor';
import { api, errorCode, queryClient, reportSessionError } from '../../lib/api';
import { AutosaveController, parseDraft, type SaveInput, type Snapshot } from '../../lib/autosave';
import { withDraftProject } from '../../lib/draft-project';
import { draftStorage } from '../../lib/draft-storage';
import { documentQuery, invalidateNavigation } from '../../lib/queries';
import { registerSave } from '../../lib/save-registry';
import { type Document, displayTitle } from '../../lib/types';

const MAX_DOCUMENT_BYTES = 1_048_576;
const controllers = new Map<string, AutosaveController>();

export function documentSnapshot(document: Document): Snapshot {
  return { title: document.title, projectId: document.projectId, content: document.content };
}

/** A document for the actions both editors share: read it, copy it and move it to the trash. */
export const documentItem = (id: string): ItemAdapter<Snapshot, Document> => ({
  type: 'document',
  id,
  queryKey: documentQuery(id).queryKey,
  read: () => api.workspace.getDocument({ id }),
  snapshot: documentSnapshot,
  createCopy: (snapshot, { projectId, folderId }, title, requestId) =>
    api.workspace.createDocument({
      title,
      content: snapshot.content,
      projectId,
      ...(folderId ? { folderId } : {}),
      requestId,
    }),
  remove: (input) => api.workspace.deleteDocument(input),
});

async function send(input: SaveInput) {
  if (new TextEncoder().encode(JSON.stringify(input.content)).length > MAX_DOCUMENT_BYTES)
    throw Object.assign(
      new Error(
        'Este documento ultrapassou o limite de 1 MB. Exporte uma cópia e divida o conteúdo em mais documentos.',
      ),
      { code: 'VALIDATION' },
    );
  try {
    // A save never moves the item: moving goes through moveItem, so the project stays out of it.
    const { projectId: _project, ...save } = input;
    return await api.workspace.saveDocument(save);
  } catch (error) {
    reportSessionError(error);
    throw error;
  }
}

/**
 * The document's autosave, one per installation and document for the life of the tab: saving outlives the
 * editor, so leaving right after an edit loses nothing.
 */
export function documentController(document: Document, installationId: string) {
  const identity = `${installationId}:${document.id}`;
  let controller = controllers.get(identity);
  if (!controller) {
    controller = new AutosaveController({
      id: document.id,
      snapshot: documentSnapshot(document),
      version: document.version,
      storage: draftStorage(identity),
      readDraft: (raw) => withDraftProject(parseDraft(raw), document.projectId),
      idFactory: () => crypto.randomUUID(),
      classifyError: errorCode,
      send,
      onSaved: (ack, sent) => {
        queryClient.setQueryData<Document>(['workspace', 'document', document.id], (previous) =>
          previous && previous.version > ack.version
            ? previous
            : {
                ...(previous ?? document),
                ...sent,
                title: displayTitle(sent.title.trim()),
                version: ack.version,
                updatedAt: ack.updatedAt,
              },
        );
        void queryClient.invalidateQueries({ queryKey: ['workspace', 'documents'] });
        void queryClient.invalidateQueries({ queryKey: ['workspace', 'tasks'] });
        invalidateNavigation();
      },
    });
    controllers.set(identity, controller);
    registerSave('document', document.id, controller);
  }
  return controller;
}
