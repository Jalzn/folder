import type { IsoInstant } from '@tinyfold/core/domain';
import { requireLiveItem } from '../items/require-item.js';
import type { PinPorts, WorkspaceFlowContext } from '../ports/context.js';
import type { PinItemInput } from '../schemas/pins.js';

export function unpinItem(
  ctx: WorkspaceFlowContext<Pick<PinPorts, 'findItem' | 'setPinnedAt'>>,
  input: PinItemInput,
): Promise<{ pinnedAt: IsoInstant | null }> {
  return ctx.writeWithoutRequestRecord(async (repo) => {
    const item = await requireLiveItem(repo, input.type, input.id);
    if (item.pinnedAt) await repo.setPinnedAt({ type: input.type, id: item.id, pinnedAt: null });
    return { pinnedAt: null };
  });
}
