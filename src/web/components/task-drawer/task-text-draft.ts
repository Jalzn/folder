import { RECOVERY_DOCUMENT_LIMITS, readDocumentContent, TASK_LIMITS } from '@tinyfold/workspace/domain';
import type { SavedDraft } from '../../lib/autosave';
import type { DocumentContent } from '../../lib/types';

/** A task's text, which saves as one: the title and the description (decision 2). */
export interface TaskTextSnapshot {
  title: string;
  description: DocumentContent;
}

const titleOk = (title: unknown) => typeof title === 'string' && title.length <= TASK_LIMITS.titleChars;

/**
 * Reads a task's stored draft, as the document's parseDraft does: anything malformed, a title over the limit
 * or a description the recovery limits refuse gives no draft; a malformed pending save is dropped alone.
 */
export function parseTaskTextDraft(value: string | null): SavedDraft<TaskTextSnapshot> | null {
  if (!value) return null;
  try {
    const data = JSON.parse(value) as SavedDraft<TaskTextSnapshot>;
    if (
      data.format !== 1 ||
      !Number.isInteger(data.baseVersion) ||
      data.baseVersion < 1 ||
      !titleOk(data.snapshot?.title) ||
      !Array.isArray(data.snapshot.description)
    )
      return null;
    data.snapshot.description = readDocumentContent(data.snapshot.description, RECOVERY_DOCUMENT_LIMITS);
    if (data.recoveryData !== undefined && data.recoveryData !== null && typeof data.recoveryData !== 'string')
      return null;
    const pending = data.pending;
    if (pending) {
      const valid =
        typeof pending.id === 'string' &&
        typeof pending.requestId === 'string' &&
        Number.isInteger(pending.expectedVersion) &&
        pending.expectedVersion >= 1 &&
        titleOk(pending.title);
      try {
        if (!valid) throw new Error('pending');
        pending.description = readDocumentContent(pending.description, RECOVERY_DOCUMENT_LIMITS);
      } catch {
        data.pending = null;
      }
    }
    return data;
  } catch {
    return null;
  }
}
