import { doneWindowStart } from '../../domain/task-dates.js';
import { requireProject } from '../helpers.js';
import type { WorkspaceContext } from '../ports.js';
import type { ProjectBoardInput } from '../schemas/tasks.js';

/**
 * One project's board in the owner's time zone: its live tasks in the open columns and those of the
 * done column completed since the start of `today − 13` (doneWindowStart), in board order, with how
 * many were completed before, for the column's footer and the Concluídas page.
 */
export async function projectBoard(ctx: WorkspaceContext, input: ProjectBoardInput) {
  const { today, timeZone } = await ctx.calendar();
  const doneSince = doneWindowStart(today, timeZone);
  return ctx.read(async (repo) => {
    await requireProject(repo, input.projectId);
    return {
      revision: await repo.revision(),
      today,
      doneSince,
      tasks: await repo.boardTasks(input.projectId, doneSince),
      olderDone: await repo.olderDoneCount(input.projectId, doneSince),
    };
  });
}
