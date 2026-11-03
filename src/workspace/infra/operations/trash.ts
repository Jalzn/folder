import { listTrash } from '../../application/navigation/list-trash.js';
import type { NavigationContext } from '../../application/navigation/ports.js';
import type { WorkspaceContext } from '../../application/ports/context.js';
import { EmptyTrashInput, ListTrashInput, PurgeItemInput } from '../../application/schemas/trash.js';
import { emptyTrash, purgeCanvas, purgeDocument, purgeTask } from '../../application/trash/index.js';
import { operation } from './operation.js';

export const trashOperations = (ctx: WorkspaceContext, navigation: NavigationContext) => ({
  listTrash: operation(ListTrashInput, (input) => listTrash(navigation, input)),
  purgeDocument: operation(PurgeItemInput, (input) => purgeDocument(ctx, input)),
  purgeCanvas: operation(PurgeItemInput, (input) => purgeCanvas(ctx, input)),
  purgeTask: operation(PurgeItemInput, (input) => purgeTask(ctx, input)),
  emptyTrash: operation(EmptyTrashInput, (input) => emptyTrash(ctx, input)),
});
