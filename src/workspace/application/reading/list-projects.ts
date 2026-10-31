import { READING_LIMITS } from '../../domain/reading-limits.js';
import type { ReadingContext } from './ports.js';
import type { ListProjectsInput } from './schemas.js';

export function listProjects(ctx: ReadingContext, input: ListProjectsInput) {
  return ctx.read(async (reader) => ({
    projects: await reader.projectsWithCounts(input.includeArchived, READING_LIMITS.projects),
    withoutProject: await reader.withoutProjectCounts(),
  }));
}
