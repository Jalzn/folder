import { NAVIGATION_LIMITS } from '../../domain/navigation-limits.js';
import { overviewTasks } from '../../domain/overview-tasks.js';
import { doneWindowStart, isOverdue } from '../../domain/task-dates.js';
import { statusOfColumn } from '../../domain/task-status.js';
import { requireProject } from '../helpers.js';
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
      done: await reader.doneTasks(input.projectId, doneWindowStart(today, timeZone), limits.done),
      recent: await reader.recentItems(input.projectId, limits.recent),
    };
  });
  const { now, rest } = overviewTasks(read.open, read.columns, today);
  const [last] = read.recent;
  return {
    today,
    openTasks: read.open.length,
    overdueTasks: read.open.filter((task) => isOverdue(task.dueOn, today, false)).length,
    now,
    // Until B6, each column also reads as the status of stage 09, which that interface shows.
    rest: rest.map((column) => ({ ...column, status: statusOfColumn(read.columns, column.columnId) })),
    done: read.done.items,
    doneTotal: read.done.total,
    recent: read.recent,
    lastEdited: last ? { type: last.type, id: last.id, title: last.title, updatedAt: last.updatedAt } : null,
  };
}
