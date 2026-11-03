import { edit, id, request } from '@tinyfold/core/application';
import { z } from 'zod';
import { FOLDER_LIMITS } from '../../domain/folders.js';

/** The raw name, bounded before folderName collapses its spaces; readFolderName checks the rest. */
const name = z.string().max(10 * FOLDER_LIMITS.nameChars);

/** Without a project, every project's active folders. */
export const ListFoldersInput = z.object({ projectId: id.optional() });
export const CreateFolderInput = z.object({ ...request, projectId: id, name });
export const RenameFolderInput = z.object({ ...edit, name });
/** Places an active folder before another of its project, or at the end with null. */
export const MoveFolderInput = z.object({ ...request, id, beforeFolderId: id.nullable() });
export type ListFoldersInput = z.infer<typeof ListFoldersInput>;
export type CreateFolderInput = z.infer<typeof CreateFolderInput>;
export type RenameFolderInput = z.infer<typeof RenameFolderInput>;
export type MoveFolderInput = z.infer<typeof MoveFolderInput>;
