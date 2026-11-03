import { searchTerms } from '@tinyfold/core/domain';
import { workspaceErrors } from '../errors.js';

/** The words of an optional query. A query made only of accents, marks and punctuation would match everything. */
export function queryTerms(query: string | undefined): string[] {
  if (query === undefined) return [];
  const terms = searchTerms(query);
  if (!terms.length) throw workspaceErrors.emptySearch();
  return terms;
}
