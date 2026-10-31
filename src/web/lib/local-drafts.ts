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

/**
 * A draft as the recovery formats save it: a document's draft as JSON, a drawing as an editable
 * `.excalidraw` file, or its raw JSON when the scene no longer reads.
 */
export function draftDownload(type: ItemType, id: string, raw: string): { blob: Blob; fileName: string } {
  const json = { blob: new Blob([raw], { type: 'application/json' }), fileName: `tinyfold-rascunho-${id}.json` };
  if (type === 'document') return json;
  const draft = parseCanvasDraft(raw);
  if (!draft) return { ...json, fileName: `tinyfold-rascunho-desenho-${id}.json` };
  return {
    blob: new Blob([canvasFile(draft.snapshot)], { type: 'application/vnd.excalidraw+json' }),
    fileName: canvasFileName(draft.snapshot.title, 'excalidraw'),
  };
}
