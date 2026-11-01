import {
  createColumn,
  deleteColumn,
  listColumns,
  moveColumn,
  renameColumn,
  restoreColumn,
  setDoneColumn,
} from '../../application/columns/index.js';
import type { WorkspaceContext } from '../../application/ports.js';
import {
  CreateColumnInput,
  DeleteColumnInput,
  ListColumnsInput,
  MoveColumnInput,
  RenameColumnInput,
  RestoreColumnInput,
  SetDoneColumnInput,
} from '../../application/schemas/columns.js';
import { operation } from './operation.js';

export const columnOperations = (ctx: WorkspaceContext) => ({
  listColumns: operation(ListColumnsInput, () => listColumns(ctx)),
  createColumn: operation(CreateColumnInput, (input) => createColumn(ctx, input)),
  renameColumn: operation(RenameColumnInput, (input) => renameColumn(ctx, input)),
  moveColumn: operation(MoveColumnInput, (input) => moveColumn(ctx, input)),
  deleteColumn: operation(DeleteColumnInput, (input) => deleteColumn(ctx, input)),
  restoreColumn: operation(RestoreColumnInput, (input) => restoreColumn(ctx, input)),
  setDoneColumn: operation(SetDoneColumnInput, (input) => setDoneColumn(ctx, input)),
});
