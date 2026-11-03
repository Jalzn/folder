import { civilWindowStart, isPastDue } from '#core/domain';
import { NAVIGATION_LIMITS } from '../../domain/navigation-limits.js';
import { overviewTasks } from '../../domain/overview-tasks.js';
import { requireProject } from '../projects/project-lookups.js';
import type { ProjectOverviewInput } from '../schemas/navigation.js';
import type { NavigationContext } from './ports.js';

/**
 * The project at a glance, in the owner's time zone: "Agora" (overviewTasks), with what it leaves
 * out per open column; the tasks completed in the done window, the latest first; the counts of open
 * and overdue tasks; and the documents and drawings edited last.
 */
export async function projectOverview(ctx: NavigationContext, input: ProjectOverviewInput) {
  const limits = NAVIGATION_LIMITS.overview;
  const { today, timeZone } = await ctx.calendar();
  const read = await ctx.read(async (reader) => {
    await requireProject(reader, input.projectId);
    return {
      columns: await reader.columns(),
      open: await reader.openTasks(input.projectId),
      done: await reader.doneTasks(input.projectId, civilWindowStart(today, timeZone, limits.doneDays), limits.done),
      recent: await reader.recentItems(input.projectId, limits.recent),
    };
  });
  const { now, rest } = overviewTasks(read.open, read.columns, today);
  const [last] = read.recent;
  return {
    today,
    openTasks: read.open.length,
    overdueTasks: read.open.filter((task) => isPastDue(task.dueOn, today)).length,
    now,
    rest,
    done: read.done.items,
    doneTotal: read.done.total,
    recent: read.recent,
    lastEdited: last ? { type: last.type, id: last.id, title: last.title, updatedAt: last.updatedAt } : null,
  };
}
