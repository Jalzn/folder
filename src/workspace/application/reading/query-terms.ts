import { AppError } from '@tinyfold/core/application';
import { searchTerms } from '../../domain/search-text.js';

/** The words of an optional query. A query made only of accents and marks would match everything. */
export function queryTerms(query: string | undefined): string[] {
  if (query === undefined) return [];
  const terms = searchTerms(query);
  if (!terms.length)
    throw new AppError('VALIDATION', 'A busca ficou vazia depois de ignorar acentos. Use outras palavras.');
  return terms;
}
