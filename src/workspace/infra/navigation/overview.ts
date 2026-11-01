import { type Kysely, sql } from 'kysely';
import type { NavigationReader, RecentItem } from '../../application/navigation/ports.js';
import { documentLead } from '../../domain/document.js';
import { excerptFromStart } from '../../domain/excerpt.js';
import type { DocumentBlock } from '../../domain/models.js';
import type { NavItemType } from '../../domain/navigation.js';
import { NAVIGATION_LIMITS } from '../../domain/navigation-limits.js';
import type { WorkspaceTables } from '../db.js';
import { itemTable } from '../item-tables.js';
import { hydrateTasks } from '../repository/tasks.js';
import { taskStatuses } from '../task-statuses.js';

type OverviewReads = Pick<NavigationReader, 'tasksInColumn' | 'recentItems'>;

const { excerptChars } = NAVIGATION_LIMITS.overview;
/** Enough of a drawing's text for an excerpt, whatever the length of the rest. */
const drawingTextStart = 2 * excerptChars;

/** What an item's excerpt starts from, and whether the stored text goes on after it. */
interface ExcerptSource {
  text: string;
  cut: boolean;
}

export function overviewReads(db: Kysely<WorkspaceTables>): OverviewReads {
  /** One type's live items. */
  const recent = (projectId: string, type: NavItemType) =>
    db
      .selectFrom(itemTable(db, type))
      .select([sql<NavItemType>`${type}`.as('type'), 'item.id', 'item.title', 'item.updated_at', 'item.folder_id'])
      .where('item.project_id', '=', projectId)
      .where('item.deleted_at', 'is', null);

  /**
   * The excerpts' sources, read only for the items shown: a document's lead (see documentLead), which
   * needs its blocks, and the start of a drawing's text, a line per text in scene order.
   */
  async function excerptSources(rows: readonly { type: NavItemType; id: string }[]) {
    const ids = (type: NavItemType) => rows.filter((row) => row.type === type).map((row) => row.id);
    const [documentIds, drawingIds] = [ids('document'), ids('drawing')];
    const documents = documentIds.length
      ? await db.selectFrom('workspace_documents').select(['id', 'content']).where('id', 'in', documentIds).execute()
      : [];
    const drawings = drawingIds.length
      ? await db
          .selectFrom('workspace_canvases')
          .select([
            'id',
            sql<string>`substr(plain_text, 1, ${drawingTextStart})`.as('text_start'),
            sql<number>`length(plain_text) > ${drawingTextStart}`.as('text_cut'),
          ])
          .where('id', 'in', drawingIds)
          .execute()
      : [];
    return new Map<string, ExcerptSource>([
      ...documents.map((row): [string, ExcerptSource] => [
        row.id,
        { text: documentLead(JSON.parse(row.content) as DocumentBlock[]), cut: false },
      ]),
      ...drawings.map((row): [string, ExcerptSource] => [row.id, { text: row.text_start, cut: Boolean(row.text_cut) }]),
    ]);
  }

  return {
    async tasksInColumn(projectId, status, limit) {
      const columnIds = (await taskStatuses(db)).columnsWith([status]);
      if (!columnIds.length) return [];
      const rows = await db
        .selectFrom('workspace_tasks as item')
        .innerJoin('workspace_columns as col', 'col.id', 'item.column_id')
        .selectAll('item')
        .where('item.project_id', '=', projectId)
        .where('item.column_id', 'in', columnIds)
        .where('item.deleted_at', 'is', null)
        .orderBy('col.position')
        .orderBy('item.position')
        .orderBy('item.id')
        .limit(limit)
        .execute();
      return hydrateTasks(db, rows);
    },

    async recentItems(projectId, limit) {
      const rows = await db
        .selectFrom(recent(projectId, 'document').unionAll(recent(projectId, 'drawing')).as('recent'))
        .leftJoin('workspace_folders as folder', 'folder.id', 'recent.folder_id')
        .select(['recent.type', 'recent.id', 'recent.title', 'recent.updated_at', 'folder.id as folder_id'])
        .select('folder.name as folder_name')
        .orderBy('recent.updated_at', 'desc')
        .orderBy('recent.id')
        .limit(limit)
        .execute();
      const sources = await excerptSources(rows);
      return rows.map((row): RecentItem => {
        const source = sources.get(row.id) ?? { text: '', cut: false };
        return {
          type: row.type,
          id: row.id,
          title: row.title,
          updatedAt: row.updated_at,
          excerpt: excerptFromStart(source.text, excerptChars, source.cut),
          folder: row.folder_id && row.folder_name ? { id: row.folder_id, name: row.folder_name } : null,
        };
      });
    },
  };
}
