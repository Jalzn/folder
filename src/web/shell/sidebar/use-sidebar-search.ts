import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useSearch } from '../../lib/queries';
import type { Project } from '../../lib/types';
import { paths } from '../../navigation/paths';
import { useSidebarRequests } from '../shell-ui';
import { itemResults } from './SearchResults';

/**
 * The sidebar's Buscar: its text, the search of the project's documents and drawings while there is text,
 * the focus that `/` and the rail's Buscar ask for, and ↵ opening the first result. Another project starts
 * with an empty search.
 */
export function useSidebarSearch(project: Project | null, focusSearch: boolean) {
  const ui = useSidebarRequests();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const handledRequest = useRef(ui.searchRequest);
  const searching = Boolean(project && query.trim());
  const search = useSearch(
    { query, ...(project ? { projectId: project.id } : {}), types: ['document', 'drawing'], limit: 20 },
    searching,
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: Another project starts with an empty search.
  useEffect(() => setQuery(''), [project?.id]);
  useEffect(() => {
    if (ui.searchRequest === handledRequest.current) return;
    handledRequest.current = ui.searchRequest;
    input.current?.focus();
  }, [ui.searchRequest]);
  useEffect(() => {
    if (focusSearch) input.current?.focus();
  }, [focusSearch]);

  function openFirst() {
    const first = itemResults(search.data?.items)[0];
    if (project && first) void navigate({ href: paths.item(project.id, first.type, first.id) });
  }
  return { query, setQuery, input, searching, search, openFirst };
}
