import { AppError } from '@tinyfold/core/application';
import { type Database, tables } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import type { TaskRecord, WorkspaceRepository } from '../application/ports.js';
import { documentPlainText, findBlock } from '../domain/document.js';
import type { Document, DocumentBlock, DocumentSummary, Project, Task } from '../domain/models.js';
import type { DocumentRow, ProjectRow, TaskRow, WorkspaceTables } from './db.js';

const projectModel = (row: ProjectRow): Project => ({
  id: row.id,
  name: row.name,
  version: row.version,
  archivedAt: row.archived_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
const projectRow = (project: Project): ProjectRow => ({
  id: project.id,
  name: project.name,
  version: project.version,
  archived_at: project.archivedAt,
  created_at: project.createdAt,
  updated_at: project.updatedAt,
});
const documentSummary = (row: Omit<DocumentRow, 'content' | 'search_text'>): DocumentSummary => ({
  id: row.id,
  title: row.title,
  projectId: row.project_id,
  plainText: row.plain_text,
  formatVersion: row.format_version,
  version: row.version,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});
const documentModel = (row: DocumentRow): Document => ({
  ...documentSummary(row),
  content: JSON.parse(row.content) as DocumentBlock[],
});
const searchText = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
const documentRow = (document: Document): DocumentRow => ({
  id: document.id,
  project_id: document.projectId,
  title: document.title,
  content: JSON.stringify(document.content),
  plain_text: document.plainText,
  search_text: searchText(`${document.title}\n${document.plainText}`),
  format_version: document.formatVersion,
  version: document.version,
  created_at: document.createdAt,
  updated_at: document.updatedAt,
  deleted_at: document.deletedAt,
});
const taskModel = (row: TaskRow): TaskRecord => ({
  id: row.id,
  title: row.title,
  projectId: row.project_id,
  status: row.status,
  position: row.position,
  version: row.version,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});
const taskRow = (task: TaskRecord): TaskRow => ({
  id: task.id,
  title: task.title,
  project_id: task.projectId,
  status: task.status,
  position: task.position,
  version: task.version,
  created_at: task.createdAt,
  updated_at: task.updatedAt,
  deleted_at: task.deletedAt,
});

function expectUpdated(count: bigint): void {
  if (count !== 1n)
    throw new AppError('VERSION_CONFLICT', 'Este item mudou em outro dispositivo. Atualize antes de continuar.');
}

export function workspaceRepository(connection: Database): WorkspaceRepository {
  const db = tables<WorkspaceTables>(connection);

  async function hydrateTasks(rows: TaskRow[]): Promise<Task[]> {
    if (!rows.length) return [];
    const sources = await db
      .selectFrom('workspace_task_sources')
      .selectAll()
      .where(
        'task_id',
        'in',
        rows.map((row) => row.id),
      )
      .execute();
    const documentIds = [...new Set(sources.map((source) => source.document_id))];
    const documents = documentIds.length
      ? await db.selectFrom('workspace_documents').selectAll().where('id', 'in', documentIds).execute()
      : [];
    const sourceMap = new Map(sources.map((source) => [source.task_id, source]));
    const documentMap = new Map(documents.map((row) => [row.id, documentModel(row)]));
    return rows.map((row) => {
      const { deletedAt: _, ...task } = taskModel(row);
      const source = sourceMap.get(row.id);
      if (!source) return { ...task, source: null };
      const document = documentMap.get(source.document_id);
      const available = Boolean(document && !document.deletedAt);
      const block = document && source.block_id ? findBlock(document.content, source.block_id) : undefined;
      const normalize = (text: string) => text.replace(/\s+/gu, ' ').trim();
      const blockAvailable =
        available &&
        (source.block_id
          ? Boolean(block && normalize(documentPlainText([block])).includes(normalize(source.excerpt)))
          : Boolean(document && normalize(document.plainText).includes(normalize(source.excerpt))));
      return {
        ...task,
        source: {
          documentId: source.document_id,
          blockId: source.block_id,
          excerpt: source.excerpt,
          documentTitle: document?.title ?? 'Documento indisponível',
          available,
          blockAvailable,
        },
      };
    });
  }

  return {
    async listProjects(includeArchived) {
      let query = db.selectFrom('workspace_projects').selectAll();
      if (!includeArchived) query = query.where('archived_at', 'is', null);
      return (await query.orderBy('updated_at', 'desc').orderBy('id').execute()).map(projectModel);
    },
    async findProject(id) {
      const row = await db.selectFrom('workspace_projects').selectAll().where('id', '=', id).executeTakeFirst();
      return row && projectModel(row);
    },
    async insertProject(project) {
      await db.insertInto('workspace_projects').values(projectRow(project)).execute();
    },
    async saveProject(project, expectedVersion) {
      const result = await db
        .updateTable('workspace_projects')
        .set(projectRow(project))
        .where('id', '=', project.id)
        .where('version', '=', expectedVersion)
        .executeTakeFirstOrThrow();
      expectUpdated(result.numUpdatedRows);
    },
    async listDocuments(input) {
      let query = db
        .selectFrom('workspace_documents')
        .select([
          'id',
          'project_id',
          'title',
          'plain_text',
          'format_version',
          'version',
          'created_at',
          'updated_at',
          'deleted_at',
        ])
        .where('deleted_at', input.deleted ? 'is not' : 'is', null);
      if (input.projectId !== undefined)
        query =
          input.projectId === null
            ? query.where('project_id', 'is', null)
            : query.where('project_id', '=', input.projectId);
      if (input.query?.trim())
        query = query.where(sql<boolean>`instr(search_text, ${searchText(input.query.trim())}) > 0`);
      return (await query.orderBy('updated_at', 'desc').orderBy('id').execute()).map((row) => ({
        ...documentSummary(row),
        plainText: row.plain_text.slice(0, 280),
      }));
    },
    async findDocument(id) {
      const row = await db.selectFrom('workspace_documents').selectAll().where('id', '=', id).executeTakeFirst();
      return row && documentModel(row);
    },
    async insertDocument(document) {
      await db.insertInto('workspace_documents').values(documentRow(document)).execute();
    },
    async saveDocument(document, expectedVersion) {
      const result = await db
        .updateTable('workspace_documents')
        .set(documentRow(document))
        .where('id', '=', document.id)
        .where('version', '=', expectedVersion)
        .executeTakeFirstOrThrow();
      expectUpdated(result.numUpdatedRows);
    },
    async listTasks(input) {
      let query = db.selectFrom('workspace_tasks').selectAll().where('deleted_at', 'is', null);
      if (input.projectId !== undefined)
        query =
          input.projectId === null
            ? query.where('project_id', 'is', null)
            : query.where('project_id', '=', input.projectId);
      if (input.documentId)
        query = query.where(
          'id',
          'in',
          db.selectFrom('workspace_task_sources').select('task_id').where('document_id', '=', input.documentId),
        );
      return hydrateTasks(await query.orderBy('position').orderBy('id').execute());
    },
    async findTask(id) {
      const row = await db.selectFrom('workspace_tasks').selectAll().where('id', '=', id).executeTakeFirst();
      return row && taskModel(row);
    },
    async taskView(id) {
      const row = await db
        .selectFrom('workspace_tasks')
        .selectAll()
        .where('id', '=', id)
        .where('deleted_at', 'is', null)
        .executeTakeFirstOrThrow();
      const [task] = await hydrateTasks([row]);
      if (!task) throw new AppError('NOT_FOUND', 'A tarefa não foi encontrada.');
      return task;
    },
    async insertTask(task) {
      await db.insertInto('workspace_tasks').values(taskRow(task)).execute();
    },
    async saveTask(task, expectedVersion) {
      const result = await db
        .updateTable('workspace_tasks')
        .set(taskRow(task))
        .where('id', '=', task.id)
        .where('version', '=', expectedVersion)
        .executeTakeFirstOrThrow();
      expectUpdated(result.numUpdatedRows);
    },
    async insertSource(source) {
      await db
        .insertInto('workspace_task_sources')
        .values({
          task_id: source.taskId,
          document_id: source.documentId,
          block_id: source.blockId,
          excerpt: source.excerpt,
        })
        .execute();
    },
    async nextPosition(status) {
      const row = await db
        .selectFrom('workspace_tasks')
        .select(({ fn }) => fn.max<number>('position').as('position'))
        .where('status', '=', status)
        .where('deleted_at', 'is', null)
        .executeTakeFirstOrThrow();
      return (row.position ?? -1) + 1;
    },
    async tasksInColumn(status) {
      return (
        await db
          .selectFrom('workspace_tasks')
          .selectAll()
          .where('status', '=', status)
          .where('deleted_at', 'is', null)
          .orderBy('position')
          .orderBy('id')
          .execute()
      ).map(taskModel);
    },
    async revision() {
      return (
        await db.selectFrom('workspace_state').select('board_revision').where('id', '=', 1).executeTakeFirstOrThrow()
      ).board_revision;
    },
    async bumpRevision() {
      const row = await db
        .updateTable('workspace_state')
        .set({ board_revision: sql`board_revision + 1` })
        .where('id', '=', 1)
        .returning('board_revision')
        .executeTakeFirstOrThrow();
      return row.board_revision;
    },
  };
}
