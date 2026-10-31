import { AppError } from '@tinyfold/core/application';
import { MAX_PINNED } from '../domain/project.js';
import { requireLiveItem } from './helpers.js';
import type { WorkspaceContext } from './ports.js';
import type { PinItemInput } from './schemas/pins.js';

/**
 * Pins a document or drawing at the top of its sidebar section, up to MAX_PINNED per project.
 * Pinning is not an edit: version and dates stay, so it never conflicts with the autosave of an
 * open page. Repeating it changes nothing, so it keeps no request record.
 */
export function pinItem(ctx: WorkspaceContext, input: PinItemInput): Promise<{ pinnedAt: string | null }> {
  return ctx.writeWithoutRequestRecord(async (repo) => {
    const item = await requireLiveItem(repo, input.type, input.id);
    if (item.pinnedAt) return { pinnedAt: item.pinnedAt };
    if ((await repo.pinnedCount(item.projectId)) >= MAX_PINNED)
      throw new AppError('DOMAIN_RULE', `Máximo de ${MAX_PINNED} fixados neste projeto. Desafixe um item antes.`);
    const pinnedAt = ctx.now();
    await repo.setPinnedAt(input.type, item.id, pinnedAt);
    return { pinnedAt };
  });
}

export function unpinItem(ctx: WorkspaceContext, input: PinItemInput): Promise<{ pinnedAt: string | null }> {
  return ctx.writeWithoutRequestRecord(async (repo) => {
    const item = await requireLiveItem(repo, input.type, input.id);
    if (item.pinnedAt) await repo.setPinnedAt(input.type, item.id, null);
    return { pinnedAt: null };
  });
}
