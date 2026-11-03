import { canvasFile, canvasFileName, parseCanvasDraft } from './canvas-autosave';
import type { ItemType } from './types';

/** Each page writes its draft under `<prefix>:<installationId>:<itemId>:<writer>` (lib/autosave). */
const draftPrefixes: Record<ItemType, string> = { document: 'tinyfold:draft', drawing: 'tinyfold:canvas-draft' };

/** The unsaved drafts this browser still keeps for an item, newest writer first is not known: any order. */
export function localDrafts(storage: Storage, installationId: string, type: ItemType, id: string): string[] {
  const prefix = `${draftPrefixes[type]}:${installationId}:${id}:`;
  const drafts: string[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    const value = key?.startsWith(prefix) ? storage.getItem(key) : null;
    if (value) drafts.push(value);
  }
  return drafts;
}

/** What a draft is downloaded from. */
export type DraftKind = 'document' | 'drawing' | 'task';

const draftNames: Record<DraftKind, string> = { document: 'documento', drawing: 'desenho', task: 'tarefa' };

/**
 * The file a draft is downloaded as, one pattern for the three items, from their pages and from the not-found
 * page alike: `tinyfold-rascunho-<documento|desenho|tarefa>-<id>.json`.
 */
export const draftFileName = (kind: DraftKind, id: string) => `tinyfold-rascunho-${draftNames[kind]}-${id}.json`;

/**
 * A draft as the recovery formats save it: a document's draft as JSON, a drawing as an editable
 * `.excalidraw` file, or its raw JSON when the scene no longer reads.
 */
export function draftDownload(type: ItemType, id: string, raw: string): { blob: Blob; fileName: string } {
  const json = { blob: new Blob([raw], { type: 'application/json' }), fileName: draftFileName(type, id) };
  if (type === 'document') return json;
  const draft = parseCanvasDraft(raw);
  if (!draft) return json;
  return {
    blob: new Blob([canvasFile(draft.snapshot)], { type: 'application/vnd.excalidraw+json' }),
    fileName: canvasFileName(draft.snapshot.title, 'excalidraw'),
  };
}
