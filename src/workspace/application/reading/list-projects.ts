import { projectCursor, readProjectCursor } from '../../domain/paging.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import { keysetPage } from './keyset-page.js';
import type { ReadingContext } from './ports.js';
import type { ListProjectsInput } from './schemas.js';

/** Projects with their item counts, most recently edited first, in pages. */
export async function listProjects(ctx: ReadingContext, input: ListProjectsInput) {
  const after = input.cursor === undefined ? undefined : readProjectCursor(input.cursor);
  const { page, withoutProject } = await ctx.read(async (reader) => ({
    page: await reader.projectsWithCounts({
      includeArchived: input.includeArchived,
      limit: READING_LIMITS.projects,
      after,
    }),
    withoutProject: await reader.withoutProjectCounts(),
  }));
  return { ...keysetPage(page, projectCursor), withoutProject };
}
