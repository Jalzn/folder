import { type Database, tables } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import type { DocumentRepository } from '../../application/ports/documents.js';
import type { WorkspaceTables } from '../db.js';
import { documentModel, documentRow, documentSummary } from './mappers.js';
import { expectUpdated } from './versioned-update.js';

export function documentRepository(connection: Database): DocumentRepository {
  const db = tables<WorkspaceTables>(connection);
  return {
    async listDocuments(input) {
      let query = db
        .selectFrom('workspace_documents')
        .select([
          'id',
          'project_id',
          'title',
          // The summary: SQLite counts code points, so an emoji is never cut in half.
          sql<string>`substr(plain_text, 1, 280)`.as('plain_text'),
          'format_version',
          'version',
          'created_at',
          'updated_at',
          'deleted_at',
          'pinned_at',
          'folder_id',
        ])
        .where('deleted_at', 'is', null);
      if (input.projectId) query = query.where('project_id', '=', input.projectId);
      return (await query.orderBy('updated_at', 'desc').orderBy('id').execute()).map(documentSummary);
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
  };
}
