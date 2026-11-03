import type { Kysely } from 'kysely';
import type { WorkspaceReader } from '../../application/reading/ports.js';
import type { SearchHit } from '../../application/reading/read-models.js';
import { excerptAround } from '../../domain/excerpt.js';
import { compareSearchKeys, searchKey } from '../../domain/list-order.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import type { WorkspaceTables } from '../sql/tables.js';
import { type ExcerptType, excerptWindows } from './excerpt-windows.js';
import { taskHits, textHits } from './search-hits.js';

type SearchReads = Pick<WorkspaceReader, 'searchItems'>;

export function searchReads(db: Kysely<WorkspaceTables>): SearchReads {
  return {
    async searchItems(query) {
      // Each source returns enough rows for one page; merging them keeps the global order.
      const needed = query.limit + 1;
      const ranked = [
        ...(query.types.includes('document') ? await textHits(db, 'document', query, needed) : []),
        ...(query.types.includes('drawing') ? await textHits(db, 'drawing', query, needed) : []),
        ...(query.types.includes('task') ? await taskHits(db, query, needed) : []),
      ];
      ranked.sort((a, b) => compareSearchKeys(searchKey(a), searchKey(b)));
      const shown = ranked.slice(0, query.limit);
      const idsOf = (type: ExcerptType) => shown.filter((hit) => hit.type === type).map((hit) => hit.id);
      const windows = new Map([
        ...(await excerptWindows(db, 'document', idsOf('document'), query.terms)),
        ...(await excerptWindows(db, 'drawing', idsOf('drawing'), query.terms)),
        ...(await excerptWindows(db, 'task', idsOf('task'), query.terms)),
      ]);
      const { excerptChars, excerptLeadChars } = READING_LIMITS.search;
      const items = shown.map((hit): SearchHit => {
        const window = windows.get(hit.id) ?? { text: '', cut: { before: false, after: false } };
        const excerpt = excerptAround(window.text, query.terms, excerptChars, excerptLeadChars, window.cut);
        return { ...hit, excerpt };
      });
      return { items, hasMore: ranked.length > query.limit };
    },
  };
}
