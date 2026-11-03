import { requireLiveItem } from '../items/require-item.js';
import type { WorkspaceContext } from '../ports/context.js';
import type { PinItemInput } from '../schemas/pins.js';

export function unpinItem(ctx: WorkspaceContext, input: PinItemInput): Promise<{ pinnedAt: string | null }> {
  return ctx.writeWithoutRequestRecord(async (repo) => {
    const item = await requireLiveItem(repo, input.type, input.id);
    if (item.pinnedAt) await repo.setPinnedAt(input.type, item.id, null);
    return { pinnedAt: null };
  });
}
