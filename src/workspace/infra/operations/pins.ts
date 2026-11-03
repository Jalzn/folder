import { operation } from '#core/application';
import { pinItem } from '../../application/pins/pin-item.js';
import { unpinItem } from '../../application/pins/unpin-item.js';
import type { PinPorts, WorkspaceFlowContext } from '../../application/ports/context.js';
import { PinItemInput } from '../../application/schemas/pins.js';

export const pinOperations = (ctx: WorkspaceFlowContext<PinPorts>) => ({
  pinItem: operation(PinItemInput, (input) => pinItem(ctx, input)),
  unpinItem: operation(PinItemInput, (input) => unpinItem(ctx, input)),
});
