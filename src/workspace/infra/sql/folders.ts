import type { FolderReference } from '../../application/reading/read-models.js';

/** The folder columns item queries select, from `folder` left-joined to `item`: null at the root. */
export const folderColumns = ['folder.id as folder_id', 'folder.name as folder_name'] as const;

export const folderReference = (row: {
  folder_id: string | null;
  folder_name: string | null;
}): FolderReference | null =>
  row.folder_id !== null && row.folder_name !== null ? { id: row.folder_id, name: row.folder_name } : null;
