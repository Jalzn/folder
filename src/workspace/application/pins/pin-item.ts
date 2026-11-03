import type { IsoInstant } from '#core/domain';
import { requireLiveItem } from '../items/require-item.js';
import { assertRoomForPin } from '../moves/pin-scope.js';
import type { PinPorts, WorkspaceFlowContext } from '../ports/context.js';
import type { PinItemInput } from '../schemas/pins.js';

/**
 * Pins a document or drawing at the top of its scope in the sidebar, the project's root or its folder,
 * up to MAX_PINNED in each.
 * Pinning is not an edit: version and dates stay, so it never conflicts with the autosave of an
 * open page. Repeating it changes nothing, so it keeps no request record.
 */
export function pinItem(
  ctx: WorkspaceFlowContext<PinPorts>,
  input: PinItemInput,
): Promise<{ pinnedAt: IsoInstant | null }> {
  return ctx.writeWithoutRequestRecord(async (repo) => {
    const item = await requireLiveItem(repo, input.type, input.id);
    if (item.pinnedAt) return { pinnedAt: item.pinnedAt };
    await assertRoomForPin(repo, item);
    const pinnedAt = ctx.now();
    await repo.setPinnedAt({ type: input.type, id: item.id, pinnedAt });
    return { pinnedAt };
  });
}
