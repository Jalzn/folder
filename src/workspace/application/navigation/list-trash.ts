import { NAVIGATION_LIMITS } from '../../domain/navigation-limits.js';
import { requireProject } from '../helpers.js';
import type { ListTrashInput } from '../schemas/trash.js';
import type { NavigationContext } from './ports.js';

/** The project's trash: documents, drawings and tasks together, the most recently deleted first. */
export async function listTrash(ctx: NavigationContext, input: ListTrashInput) {
  const items = await ctx.read(async (reader) => {
    await requireProject(reader, input.projectId);
    return reader.trashItems(input.projectId, NAVIGATION_LIMITS.trash.items);
  });
  return { items };
}
