import type { SavedDraft } from './autosave';

/**
 * A draft kept from before every item had a project carries `projectId: null`. It is recovered into the
 * item's project, in its snapshot and in its pending save, so the server never receives the null.
 */
export function withDraftProject<T extends { projectId: string | null }>(
  draft: SavedDraft<T> | null,
  projectId: string | null,
): SavedDraft<T> | null {
  if (!draft || !projectId) return draft;
  return {
    ...draft,
    snapshot: draft.snapshot.projectId === null ? { ...draft.snapshot, projectId } : draft.snapshot,
    pending: draft.pending?.projectId === null ? { ...draft.pending, projectId } : draft.pending,
  };
}
