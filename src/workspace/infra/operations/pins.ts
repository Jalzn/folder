import { pinItem, unpinItem } from '../../application/pins.js';
import type { WorkspaceContext } from '../../application/ports/context.js';
import { PinItemInput } from '../../application/schemas/pins.js';
import { operation } from './operation.js';

export const pinOperations = (ctx: WorkspaceContext) => ({
  pinItem: operation(PinItemInput, (input) => pinItem(ctx, input)),
  unpinItem: operation(PinItemInput, (input) => unpinItem(ctx, input)),
});
