import { pinItem } from '../../application/pins/pin-item.js';
import { unpinItem } from '../../application/pins/unpin-item.js';
import type { WorkspaceContext } from '../../application/ports/context.js';
import { PinItemInput } from '../../application/schemas/pins.js';
import { operation } from './operation.js';

export const pinOperations = (ctx: WorkspaceContext) => ({
  pinItem: operation(PinItemInput, (input) => pinItem(ctx, input)),
  unpinItem: operation(PinItemInput, (input) => unpinItem(ctx, input)),
});
