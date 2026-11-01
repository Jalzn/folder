import './sidebar.css';
import { Search } from 'lucide-react';
import { useRef } from 'react';
import type { Project } from '../../lib/types';
import { Kbd } from '../../ui';
import { useShellActions } from '../shell-ui';
import { ItemsSection } from './ItemsSection';
import { SearchResults } from './SearchResults';
import { SidebarFooter } from './SidebarFooter';
import { SidebarHeader } from './SidebarHeader';
import { SidebarNav } from './SidebarNav';
import { SidebarSearch } from './SidebarSearch';
import { entryRow } from './tree/tree-dom';
import { useFolderReveal } from './use-folder-reveal';
import { useNavigationData } from './use-navigation-data';
import { useRovingFocus } from './use-roving-focus';
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
  const { query, setQuery, input, searching, search, openFirst } = useSidebarSearch(project, focusSearch);
  // A folder from the filter or from ⌘K: it opens in the tree, and its first child takes the focus.
  const openFolder = useFolderReveal(project?.id ?? null, treeRef, () => setQuery(''));
  return (
    <div className="sidebar" data-region="sidebar">
      <SidebarHeader project={project} place={place} collapseLabel={collapseLabel} onCollapse={onCollapse} />
      {project ? (
        <nav
          ref={roving.ref}
          className="sidebar__nav"
          aria-label={`Projeto ${project.name}`}
          onKeyDown={(event) => {
            // ↓ on the last row of the navigation goes on into the tree, at its current row.
            const rows = [...(roving.ref.current?.querySelectorAll<HTMLElement>('[data-roving]') ?? [])];
            if (event.key === 'ArrowDown' && rows.at(-1) === event.target) {
              const row = entryRow(treeRef.current);
              if (row) {
                event.preventDefault();
                row.focus();
                return;
              }
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
              inputRef={input}
            />
            <SidebarNav project={project} openTasks={navigation?.openTasks} />
          </div>
          <div className="sidebar__sections">
            {searching ? (
              <SearchResults
                projectId={project.id}
                query={query}
                folders={navigation?.tree.folders ?? []}
                results={search.data?.items}
                error={search.error}
                onOpenFolder={openFolder}
              />
            ) : (
              <ItemsSection
                project={project}
                tree={navigation?.tree}
                treeRef={treeRef}
                onLeaveUp={() => {
                  const rows = roving.ref.current?.querySelectorAll<HTMLElement>('[data-roving]');
                  const last = rows?.[rows.length - 1];
                  if (last) {
                    for (const row of rows ?? []) row.tabIndex = row === last ? 0 : -1;
                    last.focus();
                  }
                }}
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
