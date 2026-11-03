import { operation } from '@tinyfold/core/application';
import { moveItem } from '../../application/moves/move-item.js';
import type { MovePorts, WorkspaceFlowContext } from '../../application/ports/context.js';
import { MoveItemInput } from '../../application/schemas/moves.js';

export const moveOperations = (ctx: WorkspaceFlowContext<MovePorts>) => ({
  moveItem: operation(MoveItemInput, (input) => moveItem(ctx, input)),
});
