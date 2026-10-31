import type { Kysely } from 'kysely';
import type { ItemCounts, WorkspaceReader } from '../../application/reading/ports.js';
import type { WorkspaceTables } from '../db.js';

type ProjectReads = Pick<WorkspaceReader, 'projectsWithCounts' | 'withoutProjectCounts'>;

export function projectReads(db: Kysely<WorkspaceTables>): ProjectReads {
  /** Live documents and drawings and the tasks outside the done column, per project (null: none). */
  async function countsByProject(): Promise<(projectId: string | null) => ItemCounts> {
    const [documents, drawings, tasks] = await Promise.all([
      db
        .selectFrom('workspace_documents')
        .select((eb) => ['project_id', eb.fn.countAll<number>().as('count')])
        .where('deleted_at', 'is', null)
        .groupBy('project_id')
        .execute(),
      db
        .selectFrom('workspace_canvases')
        .select((eb) => ['project_id', eb.fn.countAll<number>().as('count')])
        .where('deleted_at', 'is', null)
        .groupBy('project_id')
        .execute(),
      db
        .selectFrom('workspace_tasks')
        .select((eb) => ['project_id', eb.fn.countAll<number>().as('count')])
        .where('deleted_at', 'is', null)
        .where('status', '<>', 'done')
        .groupBy('project_id')
        .execute(),
    ]);
    const byProject = (rows: { project_id: string | null; count: number }[]) =>
      new Map(rows.map((row) => [row.project_id, row.count]));
    const [documentCounts, drawingCounts, taskCounts] = [byProject(documents), byProject(drawings), byProject(tasks)];
    return (projectId) => ({
      documents: documentCounts.get(projectId) ?? 0,
      drawings: drawingCounts.get(projectId) ?? 0,
      openTasks: taskCounts.get(projectId) ?? 0,
    });
  }

  return {
    async projectsWithCounts(includeArchived, limit) {
      let query = db
        .selectFrom('workspace_projects')
        .select(['id', 'name', 'archived_at', 'created_at', 'updated_at'])
        .orderBy('updated_at', 'desc')
        .orderBy('id')
        .limit(limit);
      if (!includeArchived) query = query.where('archived_at', 'is', null);
      const [projects, counts] = await Promise.all([query.execute(), countsByProject()]);
      return projects.map((project) => ({
        id: project.id,
        name: project.name,
        archived: project.archived_at !== null,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        ...counts(project.id),
      }));
    },
    async withoutProjectCounts() {
      return (await countsByProject())(null);
    },
  };
}
