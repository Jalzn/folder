import { NAVIGATION_LIMITS } from '../../domain/navigation-limits.js';
import type { ListTrashInput } from '../schemas/trash.js';
import type { NavigationContext } from './ports.js';
import { requireProject } from './require-project.js';

/** The project's trash: documents, drawings and tasks together, the most recently deleted first. */
export async function listTrash(ctx: NavigationContext, input: ListTrashInput) {
  const items = await ctx.read(async (reader) => {
    await requireProject(reader, input.projectId);
    return reader.trashItems(input.projectId, NAVIGATION_LIMITS.trash.listed);
  });
  return { items };
}
