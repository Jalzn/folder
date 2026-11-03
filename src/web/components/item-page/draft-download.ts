import { type DraftKind, draftFileName } from '../../lib/autosave/local-drafts';
import { downloadFile } from '../../lib/files/download';

export { type DraftKind, draftFileName };

/** What every draft download says. */
export const DRAFT_DOWNLOADED = 'Uma cópia do rascunho foi baixada.';

/** Saves a draft's raw text as its file. */
export const downloadDraft = (raw: string, kind: DraftKind, id: string) =>
  downloadFile(new Blob([raw], { type: 'application/json' }), draftFileName(kind, id));
