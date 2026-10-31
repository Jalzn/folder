import './sidebar.css';
import { useNavigate } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearch } from '../../lib/queries';
import type { Project } from '../../lib/types';
import { paths } from '../../router/paths';
import { Kbd } from '../../ui';
import { useShellUi } from '../shell-ui';
import { ItemSection } from './ItemSection';
import { SearchResults } from './SearchResults';
import { SidebarFooter } from './SidebarFooter';
import { SidebarHeader } from './SidebarHeader';
import { SidebarNav } from './SidebarNav';
import { SidebarSearch } from './SidebarSearch';
import { useNavigationData } from './use-navigation-data';
import { useRovingFocus } from './use-roving-focus';

/**
 * The project's sidebar, variant A (docs/interface/sidebar.md): the switcher, Buscar, Visão geral and Quadro
 * fixed at the top, Documentos and Desenhos scrolling, or the search results in their place, and Você and
 * the trash fixed at the bottom. Without an active project, the switcher, Buscar (⌘K) and Você remain.
 */
export function ProjectSidebar({
  project,
  place,
  collapseLabel,
  onCollapse,
  focusSearch = false,
}: {
  project: Project | null;
  /** The fixed sidebar, or the one over the page. */
  place: 'sidebar' | 'overlay';
  collapseLabel: string;
  onCollapse: () => void;
  /** Opened by `/` or the rail's Buscar: the field takes focus. */
  focusSearch?: boolean;
}) {
  const ui = useShellUi();
  const navigate = useNavigate();
  const navigation = useNavigationData(project);
  const roving = useRovingFocus<HTMLElement>();
  const [query, setQuery] = useState('');
  const searchInput = useRef<HTMLInputElement>(null);
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
    searchInput.current?.focus();
  }, [ui.searchRequest]);
  useEffect(() => {
    if (focusSearch) searchInput.current?.focus();
  }, [focusSearch]);

  function openFirst() {
    const results = search.data?.items ?? [];
    const first = results.find((item) => item.type === 'document') ?? results.find((item) => item.type === 'drawing');
    if (project && first && first.type !== 'task')
      void navigate({ href: paths.item(project.id, first.type, first.id) });
  }
  return (
    <div className="sidebar" data-region="sidebar">
      <SidebarHeader project={project} place={place} collapseLabel={collapseLabel} onCollapse={onCollapse} />
      {project ? (
        <nav
          ref={roving.ref}
          className="sidebar__nav"
          aria-label={`Projeto ${project.name}`}
          onKeyDown={roving.onKeyDown}
        >
          <div className="sidebar-nav">
            <SidebarSearch
              projectName={project.name}
              query={query}
              onQueryChange={setQuery}
              onOpenFirst={openFirst}
              inputRef={searchInput}
            />
            <SidebarNav project={project} openTasks={navigation?.openTasks} />
          </div>
          <div className="sidebar__sections">
            {searching ? (
              <SearchResults projectId={project.id} query={query} results={search.data?.items} error={search.error} />
            ) : (
              <>
                <ItemSection project={project} kind="documents" section={navigation?.documents} />
                <ItemSection project={project} kind="drawings" section={navigation?.drawings} />
              </>
            )}
          </div>
        </nav>
      ) : (
        <div className="sidebar-nav sidebar__spacer">
          <button type="button" className="sidebar-row" onClick={() => ui.openPalette()}>
            <Search size={16} />
            <span className="sidebar-row__name">Buscar</span>
            <span className="sidebar-row__meta">
              <Kbd>/</Kbd>
            </span>
          </button>
        </div>
      )}
      <SidebarFooter project={project} trashCount={navigation?.trashCount} />
    </div>
  );
}
