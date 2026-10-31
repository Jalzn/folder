import { moveItem } from '../../application/moves.js';
import type { WorkspaceContext } from '../../application/ports.js';
import { MoveItemInput } from '../../application/schemas/moves.js';
import { operation } from './operation.js';

export const moveOperations = (ctx: WorkspaceContext) => ({
  moveItem: operation(MoveItemInput, (input) => moveItem(ctx, input)),
});
