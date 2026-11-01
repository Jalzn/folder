import './sidebar.css';
import { Search } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Project } from '../../lib/types';
import { Kbd } from '../../ui';
import { useShellActions } from '../shell-ui';
import { ItemsSection } from './ItemsSection';
import { SearchResults } from './SearchResults';
import { SidebarFooter } from './SidebarFooter';
import { SidebarHeader } from './SidebarHeader';
import { SidebarNav } from './SidebarNav';
import { SidebarSearch } from './SidebarSearch';
import type { TreeHandle } from './tree/ItemsTree';
import { useFolderReveal } from './use-folder-reveal';
import { useNavigationData } from './use-navigation-data';
import { firstRow, useRovingFocus } from './use-roving-focus';
import { useSidebarSearch } from './use-sidebar-search';

/**
 * The project's sidebar, variant A (docs/interface/sidebar.md): the switcher, Buscar, Visão geral and Quadro
 * fixed at the top, the Itens tree scrolling, or the search results in its place, and Você and the trash
 * fixed at the bottom. Without an active project, the switcher, Buscar (⌘K) and Você remain.
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
  const ui = useShellActions();
  const navigation = useNavigationData(project);
  const roving = useRovingFocus<HTMLElement>();
  const treeRef = useRef<HTMLDivElement>(null);
  const treeHandle = useRef<TreeHandle>(null);
  const sections = useRef<HTMLDivElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const { query, setQuery, input, searching, search, openFirst } = useSidebarSearch(project, focusSearch);
  // A folder from the filter or from ⌘K: it opens in the tree, and its first child takes the focus.
  const openFolder = useFolderReveal(project?.id ?? null, treeRef, () => setQuery(''));
  // Results replace the sections: the list starts again at the top.
  useEffect(() => {
    if (query) sections.current?.scrollTo({ top: 0 });
  }, [query]);
  return (
    <div className="sidebar" data-region="sidebar">
      <SidebarHeader project={project} place={place} collapseLabel={collapseLabel} onCollapse={onCollapse} />
      {project ? (
        <nav
          ref={roving.ref}
          className="sidebar__nav"
          aria-label={`Projeto ${project.name}`}
          onKeyDown={(event) => {
            // ↓ on the last row of the navigation goes on into the tree, at the open item's row.
            if (event.key === 'ArrowDown' && roving.isLast(event.target) && treeHandle.current?.focusEntry()) {
              event.preventDefault();
              return;
            }
            roving.onKeyDown(event);
          }}
        >
          <div className="sidebar-nav">
            <SidebarSearch
              projectName={project.name}
              query={query}
              onQueryChange={setQuery}
              onOpenFirst={openFirst}
              onArrowDown={() => firstRow(results.current)?.focus()}
              inputRef={input}
            />
            <SidebarNav project={project} openTasks={navigation?.openTasks} overdueTasks={navigation?.overdueTasks} />
          </div>
          <div className="sidebar__sections" ref={sections}>
            {searching ? (
              <SearchResults
                projectId={project.id}
                query={query}
                folders={navigation?.tree.folders ?? []}
                results={search.data?.items}
                error={search.error}
                onOpenFolder={openFolder}
                listRef={results}
              />
            ) : (
              <ItemsSection
                project={project}
                tree={navigation?.tree}
                treeRef={treeRef}
                handleRef={treeHandle}
                onLeaveUp={roving.focusLast}
              />
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
