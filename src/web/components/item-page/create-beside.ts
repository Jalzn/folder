import { queryClient } from '../../lib/api';
import { inFolderOrRoot } from '../../lib/folder-fallback';
import { type CopyDestination, copyFolder } from '../../shell';

export interface BesidePlace {
  projectId: string;
  folderId: string | undefined;
}

/** Copies and imports stay in the open item's folder only while they stay in its project. */
export function besidePlace(own: string, queryKey: readonly unknown[], destination: CopyDestination): BesidePlace {
  const open = queryClient.getQueryData<{ folderId: string | null }>(queryKey);
  return {
    projectId: destination.project.id,
    folderId: copyFolder({ projectId: own, folderId: open?.folderId ?? null }, destination),
  };
}

/** Keep a root fallback on the pending intent, so every retry uses the same destination. */
export function createBeside<T>(place: BesidePlace, create: (place: BesidePlace) => Promise<T>) {
  return inFolderOrRoot(place.folderId, (folderId) => {
    place.folderId = folderId;
    return create({ projectId: place.projectId, folderId });
  });
}
