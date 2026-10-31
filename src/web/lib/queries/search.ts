import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { useDebouncedValue } from '../use-debounced-value';

export type SearchInput = Parameters<typeof api.workspace.search>[0];
export type SearchResult = Awaited<ReturnType<typeof api.workspace.search>>['items'][number];

/**
 * The search of the MCP tools over RPC: every word required, titles first, an excerpt around the first
 * match. The text settles for 120 ms before a request; the previous results stay while the next arrive.
 */
export function useSearch({ query: typed, ...input }: Omit<SearchInput, 'query'> & { query: string }, enabled = true) {
  const query = useDebouncedValue(typed.trim(), 120);
  return useQuery({
    queryKey: ['workspace', 'search', { ...input, query }],
    queryFn: () => api.workspace.search({ ...input, ...(query ? { query } : {}) }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 5_000,
  });
}
