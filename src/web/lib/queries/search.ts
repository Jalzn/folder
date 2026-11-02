import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { useDebouncedValue } from '../use-debounced-value';
import { keys } from './keys';

export type SearchInput = Parameters<typeof api.workspace.search>[0];
export type SearchResult = Awaited<ReturnType<typeof api.workspace.search>>['items'][number];

/**
 * The search of the MCP tools over RPC: every word required, titles first, an excerpt around the first
 * match. The text settles for 120 ms before a request; the previous results stay while the next arrive, and
 * `answers` says which text the results on hand answer: the one typed now, or null while they are older.
 */
export function useSearch({ query: typed, ...input }: Omit<SearchInput, 'query'> & { query: string }, enabled = true) {
  const query = useDebouncedValue(typed.trim(), 120);
  const search = useQuery({
    queryKey: keys.search({ ...input, query }),
    queryFn: () => api.workspace.search({ ...input, ...(query ? { query } : {}) }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 5_000,
  });
  const answers = query === typed.trim() && search.data && !search.isPlaceholderData ? query : null;
  return { ...search, answers };
}
