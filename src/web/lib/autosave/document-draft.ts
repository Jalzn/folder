import { RECOVERY_DOCUMENT_LIMITS, readDocumentContent } from '@tinyfold/rich-text/domain';
import { sanitizeEmbeds } from '../files/sanitize-embeds';
import type { DocumentContent } from '../types';
import type { Legacy, SavedDraft } from './types';

/** What a document's autosave keeps and sends. */
export interface Snapshot {
  title: string;
  projectId: string;
  content: DocumentContent;
}

/**
 * Reads a stored draft; one from before every item had a project may have `projectId: null` (withDraftProject).
 * Blocks a Tab once nested under an embed come out after it first, and an embed with an ID the server
 * refuses goes, so that draft opens (sanitizeEmbeds).
 */
export function parseDraft(value: string | null): SavedDraft<Legacy<Snapshot>> | null {
  if (!value) return null;
  try {
    const data = JSON.parse(value) as SavedDraft<Legacy<Snapshot>>;
    if (
      data.format !== 1 ||
      !Number.isInteger(data.baseVersion) ||
      data.baseVersion < 1 ||
      !Array.isArray(data.snapshot?.content) ||
      typeof data.snapshot.title !== 'string' ||
      data.snapshot.title.length > 300 ||
      (data.snapshot.projectId !== null && typeof data.snapshot.projectId !== 'string')
    )
      return null;
    data.snapshot.content = readDocumentContent(sanitizeEmbeds(data.snapshot.content), RECOVERY_DOCUMENT_LIMITS, {
      embeds: true,
    });
    if (data.recoveryData !== undefined && data.recoveryData !== null && typeof data.recoveryData !== 'string')
      return null;
    if (data.pending) {
      if (
        typeof data.pending.id !== 'string' ||
        typeof data.pending.requestId !== 'string' ||
        !Number.isInteger(data.pending.expectedVersion) ||
        data.pending.expectedVersion < 1 ||
        typeof data.pending.title !== 'string' ||
        data.pending.title.length > 300 ||
        (data.pending.projectId !== null && typeof data.pending.projectId !== 'string')
      )
        data.pending = null;
      else {
        try {
          data.pending.content = readDocumentContent(sanitizeEmbeds(data.pending.content), RECOVERY_DOCUMENT_LIMITS, {
            embeds: true,
          });
        } catch {
          data.pending = null;
        }
      }
    }
    return data;
  } catch {
    return null;
  }
}
