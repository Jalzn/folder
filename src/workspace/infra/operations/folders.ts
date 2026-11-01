import {
  createFolder,
  deleteFolder,
  listFolders,
  moveFolder,
  renameFolder,
  restoreFolder,
} from '../../application/folders/index.js';
import type { WorkspaceContext } from '../../application/ports.js';
import {
  CreateFolderInput,
  DeleteFolderInput,
  ListFoldersInput,
  MoveFolderInput,
  RenameFolderInput,
  RestoreFolderInput,
} from '../../application/schemas/folders.js';
import { operation } from './operation.js';

export const folderOperations = (ctx: WorkspaceContext) => ({
  listFolders: operation(ListFoldersInput, (input) => listFolders(ctx, input)),
  createFolder: operation(CreateFolderInput, (input) => createFolder(ctx, input)),
  renameFolder: operation(RenameFolderInput, (input) => renameFolder(ctx, input)),
  moveFolder: operation(MoveFolderInput, (input) => moveFolder(ctx, input)),
  deleteFolder: operation(DeleteFolderInput, (input) => deleteFolder(ctx, input)),
  restoreFolder: operation(RestoreFolderInput, (input) => restoreFolder(ctx, input)),
});
