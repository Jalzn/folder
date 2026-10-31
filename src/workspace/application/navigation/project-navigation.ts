import { navSection, openTaskCount } from '../../domain/navigation.js';
import type { ProjectNavigationInput } from '../schemas/navigation.js';
import type { NavigationContext } from './ports.js';
import { requireProject } from './require-project.js';

/**
 * What the project's sidebar shows: its documents and drawings, pinned ones first, the number of
 * open tasks and the number of items in its trash.
 */
export async function projectNavigation(ctx: NavigationContext, input: ProjectNavigationInput) {
  const { documents, drawings, taskCounts, trashCount } = await ctx.read(async (reader) => {
    await requireProject(reader, input.projectId);
    return {
      documents: await reader.navItems(input.projectId, 'document'),
      drawings: await reader.navItems(input.projectId, 'drawing'),
      taskCounts: await reader.taskCounts(input.projectId),
      trashCount: await reader.trashCount(input.projectId),
    };
  });
  return {
    documents: navSection(documents, input.documentsSort, input.limit),
    drawings: navSection(drawings, input.drawingsSort, input.limit),
    openTasks: openTaskCount(taskCounts),
    trashCount,
  };
}
