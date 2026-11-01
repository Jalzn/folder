import { navTree } from '../../domain/navigation-tree.js';
import { requireProject } from '../helpers.js';
import type { ProjectNavigationInput } from '../schemas/navigation.js';
import type { NavigationContext } from './ports.js';

/**
 * What the project's sidebar shows: its documents and drawings as the "Itens" tree (see navTree), the
 * number of open tasks (outside the done column), of overdue ones in the owner's time zone, and of items
 * in its trash.
 */
export async function projectNavigation(ctx: NavigationContext, input: ProjectNavigationInput) {
  const { today } = await ctx.calendar();
  const { documents, drawings, folders, openTasks, overdueTasks, trashCount } = await ctx.read(async (reader) => {
    await requireProject(reader, input.projectId);
    return {
      documents: await reader.navItems(input.projectId, 'document'),
      drawings: await reader.navItems(input.projectId, 'drawing'),
      folders: await reader.folders(input.projectId),
      openTasks: await reader.openTaskCount(input.projectId),
      overdueTasks: await reader.overdueCount(input.projectId, today),
      trashCount: await reader.trashCount(input.projectId),
    };
  });
  return {
    tree: navTree([...documents, ...drawings], folders, input.sort, input.limit),
    openTasks,
    overdueTasks,
    trashCount,
  };
}
