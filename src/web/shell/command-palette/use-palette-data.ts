import { useAllFolders, useSearch } from '../../lib/queries';

/**
 * What the palette reads as it is typed in: the search (the eight edited last without text, twelve results
 * with it) and every project's folders for Pastas, once there is text. `searching` while the results on hand
 * answer an earlier text: they stay in place, but they are not this text's.
 */
export function usePaletteData(query: string) {
  const typed = query.trim() !== '';
  const results = useSearch({ query, limit: typed ? 12 : 8 });
  const folders = useAllFolders(typed);
  return {
    results: results.data?.items ?? [],
    searching: results.answers === null,
    folders: folders.data ?? [],
  };
}
