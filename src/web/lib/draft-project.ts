import type { Legacy, SavedDraft } from './autosave';

/**
 * A draft kept from before every item had a project carries `projectId: null`. It is recovered into the
 * item's project, in its snapshot and in its pending save, so the editor never holds the null.
 */
export function withDraftProject<T extends { projectId: string }>(
  draft: SavedDraft<Legacy<T>> | null,
  projectId: string,
): SavedDraft<T> | null {
  if (!draft) return null;
  const own = <S extends { projectId: string | null }>(value: S) =>
    ({ ...value, projectId: value.projectId ?? projectId }) as unknown as Omit<S, 'projectId'> & { projectId: string };
  return {
    ...draft,
    snapshot: own(draft.snapshot) as unknown as T,
    pending: draft.pending ? (own(draft.pending) as unknown as SavedDraft<T>['pending']) : null,
  };
}
