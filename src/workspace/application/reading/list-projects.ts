import { projectCursor, readProjectCursor } from '../../domain/paging.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';
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
  return {
    projects: page.items,
    withoutProject,
    /** The cursor after the first `shown` projects, which may be fewer than the page; null at the end. */
    nextCursor(shown: number) {
      const last = page.items[shown - 1];
      return last && (shown < page.items.length || page.hasMore) ? projectCursor(last) : null;
    },
  };
}
