import { type Database, tables, versionedUpdate } from '@tinyfold/core/infra';
import type { DocumentBlock } from '@tinyfold/rich-text/domain';
import { sql } from 'kysely';
import type { DocumentRepository } from '../../application/ports.js';
import { documentModel, documentRow, documentSummary } from '../sql/mappers.js';
import type { DocumentTables } from '../sql/table.js';

export function documentRepository(connection: Database): DocumentRepository {
  const db = tables<DocumentTables>(connection);
  return {
    async listDocuments(input) {
      let query = db
        .selectFrom('workspace_documents')
        .select([
          'id',
          'project_id',
          'title',
          // SQLite counts code points, preserving a complete emoji at the summary limit.
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
    async findDocumentPlacement(id) {
      const row = await db
        .selectFrom('workspace_documents')
        .select(['id', 'folder_id', 'pinned_at'])
        .where('id', '=', id)
        .executeTakeFirst();
      return row && { id: row.id, folderId: row.folder_id, pinnedAt: row.pinned_at };
    },
    async insertDocument(document) {
      await db.insertInto('workspace_documents').values(documentRow(document)).execute();
    },
    async saveDocument(document, expectedVersion) {
      await versionedUpdate(db.updateTable('workspace_documents').set(documentRow(document)), {
        id: document.id,
        expectedVersion,
      });
    },
    async findDocumentsForOrigins(ids) {
      if (!ids.length) return new Map();
      const rows = await db
        .selectFrom('workspace_documents')
        .select(['id', 'title', 'deleted_at', 'content', 'plain_text'])
        .where('id', 'in', [...new Set(ids)])
        .execute();
      return new Map(
        rows.map((row) => [
          row.id,
          {
            id: row.id,
            title: row.title,
            deletedAt: row.deleted_at,
            content: JSON.parse(row.content) as DocumentBlock[],
            plainText: row.plain_text,
          },
        ]),
      );
    },
    async findDocumentMetadataForOrigins(ids) {
      if (!ids.length) return new Map();
      const rows = await db
        .selectFrom('workspace_documents')
        .select(['id', 'title', 'deleted_at'])
        .where('id', 'in', [...new Set(ids)])
        .execute();
      return new Map(rows.map((row) => [row.id, { id: row.id, title: row.title, deletedAt: row.deleted_at }]));
    },
    async placeDocument({ id, folderId, pinnedAt }) {
      await db
        .updateTable('workspace_documents')
        .set({ folder_id: folderId, pinned_at: pinnedAt })
        .where('id', '=', id)
        .execute();
    },
    async moveDocument({ id, projectId, expectedVersion }) {
      await versionedUpdate(
        db.updateTable('workspace_documents').set({
          project_id: projectId,
          folder_id: null,
          pinned_at: null,
          version: expectedVersion + 1,
        }),
        { id, expectedVersion },
      );
    },
    async setDocumentPinnedAt({ id, pinnedAt }) {
      await db.updateTable('workspace_documents').set({ pinned_at: pinnedAt }).where('id', '=', id).execute();
    },
    async trashDocument({ id, at, expectedVersion }) {
      await versionedUpdate(
        db.updateTable('workspace_documents').set({
          deleted_at: at,
          updated_at: at,
          pinned_at: null,
          version: expectedVersion + 1,
        }),
        { id, expectedVersion },
      );
    },
    async restoreDocument({ id, place, at, expectedVersion }) {
      await versionedUpdate(
        db.updateTable('workspace_documents').set({
          deleted_at: null,
          updated_at: at,
          folder_id: place.folderId,
          pinned_at: place.pinnedAt,
          version: expectedVersion + 1,
        }),
        { id, expectedVersion },
      );
    },
    async deleteDocumentRow(id) {
      await db.deleteFrom('workspace_documents').where('id', '=', id).execute();
    },
  };
}
