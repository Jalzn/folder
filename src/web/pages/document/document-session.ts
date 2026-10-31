import { api, errorCode, queryClient, reportSessionError } from '../../lib/api';
import { AutosaveController, parseDraft, type SaveInput, type Snapshot } from '../../lib/autosave';
import { withDraftProject } from '../../lib/draft-project';
import { invalidateNavigation } from '../../lib/queries';
import { registerSave } from '../../lib/save-registry';
import type { Document } from '../../lib/types';

const MAX_DOCUMENT_BYTES = 1_048_576;
const controllers = new Map<string, AutosaveController>();

export function documentSnapshot(document: Document): Snapshot {
  return { title: document.title, projectId: document.projectId, content: document.content };
}

/**
 * The document's local draft. A duplicated browser tab inherits sessionStorage, so each opening writes to a
 * fresh record and uses the inherited pointer only to recover.
 */
function draftStorage(identity: string) {
  const key = `tinyfold:draft:${identity}:${crypto.randomUUID()}`;
  const pointerKey = `tinyfold:draft-pointer:${identity}`;
  let previousKey: string | null = null;
  try {
    previousKey = sessionStorage.getItem(pointerKey);
  } catch {
    /* Local storage may still preserve this page's draft. */
  }
  return {
    read: () => {
      const value = localStorage.getItem(key) ?? (previousKey ? localStorage.getItem(previousKey) : null);
      if (value !== null) {
        // Copy before replacing the pointer, including drafts that cannot be rendered.
        try {
          localStorage.setItem(key, value);
          sessionStorage.setItem(pointerKey, key);
        } catch {
          /* Keep the predecessor pointer if storage is full. */
        }
      }
      return value;
    },
    write: (value: string) => {
      localStorage.setItem(key, value);
      sessionStorage.setItem(pointerKey, key);
    },
    remove: () => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(pointerKey);
    },
  };
}

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
                projectId: sent.projectId ?? (previous ?? document).projectId,
                title: sent.title.trim() || 'Sem título',
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
