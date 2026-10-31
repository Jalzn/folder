import { type Database, tables } from '@tinyfold/core/infra';
import { sql } from 'kysely';
import type { DocumentRepository } from '../../application/ports.js';
import { searchText } from '../../domain/search-text.js';
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
          'plain_text',
          'format_version',
          'version',
          'created_at',
          'updated_at',
          'deleted_at',
        ])
        .where('deleted_at', input.deleted ? 'is not' : 'is', null);
      if (input.projectId) query = query.where('project_id', '=', input.projectId);
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
  };
}
