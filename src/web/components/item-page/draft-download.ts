import { downloadFile } from '../../lib/download';

/** What a draft that could not open is downloaded from. */
export type DraftKind = 'document' | 'drawing' | 'task';

/**
 * The file a draft is downloaded as, one pattern for the three items (decision 7): `tinyfold-rascunho-<id>.json`
 * for a document, as the not-found page names it too, and `tinyfold-rascunho-desenho-` or `-tarefa-` before the
 * ID for the others.
 */
export const draftFileName = (kind: DraftKind, id: string) =>
  kind === 'document'
    ? `tinyfold-rascunho-${id}.json`
    : `tinyfold-rascunho-${kind === 'drawing' ? 'desenho' : 'tarefa'}-${id}.json`;

/** What every draft download says. */
export const DRAFT_DOWNLOADED = 'Uma cópia do rascunho foi baixada.';

/** Saves a draft's raw text as its file. */
export const downloadDraft = (raw: string, kind: DraftKind, id: string) =>
  downloadFile(new Blob([raw], { type: 'application/json' }), draftFileName(kind, id));
