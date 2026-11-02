import type { ItemAdapter } from '../../components/item-page';
import { api } from '../../lib/api';
import { parseDraft, type Snapshot } from '../../lib/autosave';
import { defineItemSession } from '../../lib/autosave/item-session';
import { draftStorage } from '../../lib/draft-storage';
import { documentQuery, keys } from '../../lib/queries';
import { refuseOverLimit } from '../../lib/text-limit';
import { type Document, displayTitle } from '../../lib/types';

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

/**
 * The document's autosave, one per installation and document for the life of the tab: saving outlives the
 * editor, so leaving right after an edit loses nothing.
 */
const documentSession = defineItemSession<Snapshot, Document>({
  type: 'document',
  snapshot: documentSnapshot,
  storage: (installationId, id) => draftStorage(`${installationId}:${id}`),
  readDraft: parseDraft,
  check: (input) =>
    refuseOverLimit(
      input.content,
      'Este documento ultrapassou o limite de 1 MB. Exporte uma cópia e divida o conteúdo em mais documentos.',
    ),
  save: (input) => api.workspace.saveDocument(input),
  saved: (previous, sent, ack) => ({
    ...previous,
    ...sent,
    title: displayTitle(sent.title.trim()),
    version: ack.version,
    updatedAt: ack.updatedAt,
  }),
  invalidate: [keys.documents(), keys.tasks()],
});

export const documentController = (document: Document, installationId: string) =>
  documentSession(document, installationId).controller;
