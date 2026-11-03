import type { ProjectsContext } from '../ports/context.js';
import type { ListProjectsInput } from '../schemas/projects.js';

/** The projects, each with its overdue tasks in the owner's time zone, which the selector shows. */
export async function listProjects(ctx: ProjectsContext, input: ListProjectsInput) {
  const { today } = await ctx.calendar();
  return ctx.read(async (repo) => {
    const overdue = await repo.overdueCounts(today);
    return (await repo.listProjects(input.includeArchived ?? false)).map((project) => ({
      ...project,
      overdueTasks: overdue.get(project.id) ?? 0,
    }));
  });
}
