import { type Kysely, sql } from 'kysely';
import type { FolderWithCount, ItemCounts, WorkspaceReader } from '../../application/reading/ports.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import type { WorkspaceTables } from '../db.js';

type ProjectReads = Pick<WorkspaceReader, 'projectsWithCounts'>;

export function projectReads(db: Kysely<WorkspaceTables>): ProjectReads {
  /** Live documents and drawings and the tasks outside the done column, per project. */
  async function countsByProject(): Promise<(projectId: string) => ItemCounts> {
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

  /** The active folders of the projects, in the sidebar's order, with their live items counted. */
  async function foldersByProject(projectIds: readonly string[]): Promise<Map<string, FolderWithCount[]>> {
    if (!projectIds.length) return new Map();
    const live = (table: 'workspace_documents' | 'workspace_canvases') =>
      sql<number>`(select count(*) from ${sql.table(table)} as filed
        where filed.folder_id = folder.id and filed.deleted_at is null)`;
    const rows = await db
      .selectFrom('workspace_folders as folder')
      .select(['folder.id', 'folder.project_id', 'folder.name'])
      .select(sql<number>`${live('workspace_documents')} + ${live('workspace_canvases')}`.as('items'))
      .where('folder.project_id', 'in', projectIds)
      .where('folder.deleted_at', 'is', null)
      .orderBy('folder.project_id')
      .orderBy('folder.position')
      .orderBy('folder.id')
      .execute();
    const byProject = new Map<string, FolderWithCount[]>();
    for (const row of rows) {
      const folders = byProject.get(row.project_id) ?? [];
      folders.push({ id: row.id, name: row.name, items: row.items });
      byProject.set(row.project_id, folders);
    }
    return byProject;
  }

  return {
    async projectsWithCounts({ includeArchived, limit, after }) {
      let query = db
        .selectFrom('workspace_projects')
        .select(['id', 'name', 'color', 'position', 'archived_at', 'created_at', 'updated_at'])
        .orderBy('updated_at', 'desc')
        .orderBy('id')
        .limit(limit + 1);
      if (!includeArchived) query = query.where('archived_at', 'is', null);
      if (after)
        query = query.where(
          sql<boolean>`(updated_at < ${after.updatedAt} or (updated_at = ${after.updatedAt} and id > ${after.id}))`,
        );
      const [projects, counts] = await Promise.all([query.execute(), countsByProject()]);
      const shown = projects.slice(0, limit);
      const folders = await foldersByProject(shown.map((project) => project.id));
      const items = shown.map((project) => ({
        id: project.id,
        name: project.name,
        color: project.color,
        position: project.archived_at === null ? project.position : null,
        archived: project.archived_at !== null,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        ...counts(project.id),
        folderCount: folders.get(project.id)?.length ?? 0,
        folders: (folders.get(project.id) ?? []).slice(0, READING_LIMITS.projectFolders),
      }));
      return { items, hasMore: projects.length > limit };
    },
  };
}
