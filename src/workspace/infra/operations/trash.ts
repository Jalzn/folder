import { operation } from '@tinyfold/core/application';
import { listTrash } from '../../application/navigation/list-trash.js';
import type { NavigationContext } from '../../application/navigation/ports.js';
import type { TrashPorts, WorkspaceFlowContext } from '../../application/ports/context.js';
import { EmptyTrashInput, ListTrashInput, PurgeItemInput } from '../../application/schemas/trash.js';
import { emptyTrash, purgeDocument } from '../../application/trash/index.js';

export const trashOperations = (ctx: WorkspaceFlowContext<TrashPorts>, navigation: NavigationContext) => ({
  listTrash: operation(ListTrashInput, (input) => listTrash(navigation, input)),
  purgeDocument: operation(PurgeItemInput, (input) => purgeDocument(ctx, input)),
  emptyTrash: operation(EmptyTrashInput, (input) => emptyTrash(ctx, input)),
});
