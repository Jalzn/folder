import { assertVersion } from '#core/application';
import { boardErrors } from '../errors.js';
import type { BoardContext } from '../ports/context.js';
import type { PurgeTaskInput } from '../schemas/purge.js';

export function purgeTask(ctx: BoardContext, input: PurgeTaskInput): Promise<{ id: string }> {
  return ctx.write('workspace.purgeTask', input, async (repo) => {
    const task = await repo.findTask(input.id);
    if (!task) throw boardErrors.taskMissing();
    assertVersion(task.version, input.expectedVersion);
    if (!task.deletedAt) throw boardErrors.itemNotTrashed();
    await repo.deleteTaskRow(task.id);
    await repo.bumpRevision();
    return { id: task.id };
  });
}
