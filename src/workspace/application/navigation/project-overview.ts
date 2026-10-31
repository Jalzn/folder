import { openTaskCount, tasksLeftOut } from '../../domain/navigation.js';
import { NAVIGATION_LIMITS } from '../../domain/navigation-limits.js';
import { requireProject } from '../helpers.js';
import type { ProjectOverviewInput } from '../schemas/navigation.js';
import type { NavigationContext } from './ports.js';

/**
 * The project at a glance: the tasks in progress, in board order, with what they leave out per
 * column, and the documents and drawings edited last.
 */
export async function projectOverview(ctx: NavigationContext, input: ProjectOverviewInput) {
  const limits = NAVIGATION_LIMITS.overview;
  const read = await ctx.read(async (reader) => {
    await requireProject(reader, input.projectId);
    return {
      now: await reader.tasksInColumn(input.projectId, 'doing', limits.now),
      taskCounts: await reader.taskCounts(input.projectId),
      recent: await reader.recentItems(input.projectId, limits.recent),
    };
  });
  const [last] = read.recent;
  return {
    openTasks: openTaskCount(read.taskCounts),
    now: read.now,
    rest: tasksLeftOut(read.taskCounts, read.now),
    recent: read.recent,
    lastEdited: last ? { type: last.type, id: last.id, title: last.title, updatedAt: last.updatedAt } : null,
  };
}
