import { assertVersion } from '../helpers.js';
import type { WorkspaceContext } from '../ports/context.js';
import type { DeleteLabelInput } from '../schemas/labels.js';
import { requireActiveLabel } from './label-rules.js';

/**
 * Deletes a label logically. Its links to tasks stay, hidden from every read, so restoreLabel gives it
 * back to every task. The answer counts the live tasks that used it, for the toast.
 */
export function deleteLabel(ctx: WorkspaceContext, input: DeleteLabelInput) {
  return ctx.write('workspace.deleteLabel', input, async (repo) => {
    const label = await requireActiveLabel(repo, input.id);
    assertVersion(label.version, input.expectedVersion);
    const tasks = await repo.liveTasksWithLabel(label.id);
    const now = ctx.now();
    const version = label.version + 1;
    await repo.saveLabel({ ...label, version, updatedAt: now, deletedAt: now }, label.version);
    return { id: label.id, version, tasks };
  });
}
