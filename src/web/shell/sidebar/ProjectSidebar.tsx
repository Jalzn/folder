import './sidebar.css';
import { useNavigate } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearch } from '../../lib/queries';
import type { Project } from '../../lib/types';
import { paths } from '../../router/paths';
import { Kbd } from '../../ui';
import { useShellUi } from '../shell-ui';
import { ItemsSection } from './ItemsSection';
import { itemResults, SearchResults } from './SearchResults';
import { SidebarFooter } from './SidebarFooter';
import { SidebarHeader } from './SidebarHeader';
import { SidebarNav } from './SidebarNav';
import { SidebarSearch } from './SidebarSearch';
import { useNavigationData } from './use-navigation-data';
import { useRovingFocus } from './use-roving-focus';
import { useSidebarPrefs } from './use-sidebar-prefs';

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
  const prefs = useSidebarPrefs();
  const roving = useRovingFocus<HTMLElement>();
  const treeRef = useRef<HTMLDivElement>(null);
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

  // A folder from the filter: it opens in the tree, the filter clears, and its first child takes the focus.
  function openFolder(folderId: string) {
    if (!project) return;
    const expanded = prefs.project(project.id)?.expanded ?? [];
    prefs.setProject(project.id, { expanded: [...new Set([...expanded, folderId])] });
    setQuery('');
    requestAnimationFrame(() => {
      const folder = treeRef.current?.querySelector<HTMLElement>(`[data-key="folder:${CSS.escape(folderId)}"]`);
      const next = folder?.nextElementSibling;
      const child = next instanceof HTMLElement && next.getAttribute('aria-level') === '2' ? next : folder;
      child?.focus();
    });
  }

  function openFirst() {
    const first = itemResults(search.data?.items)[0];
    if (project && first) void navigate({ href: paths.item(project.id, first.type, first.id) });
  }
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
            if (event.key === 'ArrowDown' && rows.at(-1) === event.target && treeRef.current) {
              const row =
                treeRef.current.querySelector<HTMLElement>('[role="row"][tabindex="0"]') ??
                treeRef.current.querySelector<HTMLElement>('[role="row"]');
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
              inputRef={searchInput}
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
