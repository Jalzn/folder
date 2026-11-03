import type { TrashPorts, WorkspaceFlowContext } from '../ports/context.js';
import type { EmptyTrashInput, TrashItemType } from '../schemas/trash.js';
import { canvasRemoval } from './purge-canvas.js';
import { documentRemoval } from './purge-document.js';
import { taskRemoval } from './purge-task.js';
import type { ItemRemoval } from './removal.js';

const removals: Record<TrashItemType, ItemRemoval> = {
  document: documentRemoval,
  drawing: canvasRemoval,
  task: taskRemoval,
};

/**
 * Deletes for good the items the trash showed, in one transaction. An item restored, edited or
 * moved on another device since then is no longer as shown: it is kept and counted as skipped.
 */
export function emptyTrash(ctx: WorkspaceFlowContext<TrashPorts>, input: EmptyTrashInput) {
  return ctx.write('workspace.emptyTrash', input, async (repo) => {
    let purged = 0;
    for (const shown of input.items) {
      const removal = removals[shown.type];
      const item = await removal.find(repo, shown.id);
      if (!item?.deletedAt || item.projectId !== input.projectId || item.version !== shown.version) continue;
      await removal.remove(repo, item);
      purged += 1;
    }
    return { purged, skipped: input.items.length - purged };
  });
}
