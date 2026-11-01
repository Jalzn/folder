import { errorCode } from './errors';

/**
 * A creation in an item's folder that falls back to the project's root when the folder is gone: a copy or
 * an import made on the page of an item whose folder was deleted elsewhere still lands, at the root, instead
 * of failing with NOT_FOUND on every try. `create` is called with the folder, then once without it.
 */
export async function inFolderOrRoot<T>(
  folderId: string | undefined,
  create: (folderId: string | undefined) => Promise<T>,
): Promise<{ created: T; atRoot: boolean }> {
  try {
    return { created: await create(folderId), atRoot: false };
  } catch (error) {
    if (!folderId || errorCode(error) !== 'NOT_FOUND') throw error;
    return { created: await create(undefined), atRoot: true };
  }
}
