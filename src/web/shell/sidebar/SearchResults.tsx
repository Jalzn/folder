import { Link } from '@tanstack/react-router';
import type { NavFolder } from '@tinyfold/workspace/domain';
import { FileText, Folder, Search, Shapes } from 'lucide-react';
import type { Ref } from 'react';
import { errorMessage } from '../../lib/api';
import { formatCount } from '../../lib/count';
import { matchesAllWords, queryWords } from '../../lib/highlight';
import type { SearchResult } from '../../lib/queries';
import { displayTitle, type ItemType } from '../../lib/types';
import { paths } from '../../router/paths';
import { Highlight, Shortcut } from '../../ui';
import { KEYS } from '../keyboard/keys';
import { useShellActions } from '../shell-ui';

const icons: Record<ItemType, typeof FileText> = { document: FileText, drawing: Shapes };

/** A document or drawing the search found; the sidebar asks for no tasks. */
export type ItemResult = Exclude<SearchResult, { type: 'task' }>;
export const itemResults = (results: readonly SearchResult[] | undefined) =>
  (results ?? []).filter((result): result is ItemResult => result.type !== 'task');

/** The folders whose name has every word of the filter, in their order. */
function matchingFolders(folders: readonly NavFolder[], query: string) {
  if (!queryWords(query).length) return [];
  return folders.filter((folder) => matchesAllWords(folder.name, query));
}

/**
 * The sidebar's results in place of the tree (docs/interface/pastas.md §3): first "Pastas", whose ↵ opens the
 * folder in the tree, then "Itens", one flat list with each item's type, its excerpt and its folder on the
 * right, and always "Buscar em todos os projetos", which takes the text to ⌘K.
 */
export function SearchResults({
  projectId,
  query,
  folders,
  results,
  error,
  onOpenFolder,
  listRef,
}: {
  projectId: string;
  query: string;
  folders: readonly NavFolder[];
  results: SearchResult[] | undefined;
  error: unknown;
  onOpenFolder: (folderId: string) => void;
  /** The list, where ↓ from Buscar comes in. */
  listRef?: Ref<HTMLDivElement> | undefined;
}) {
  const ui = useShellActions();
  const matched = matchingFolders(folders, query);
  const items = itemResults(results);
  return (
    <div className="sidebar-results" ref={listRef}>
      {error ? <p className="sidebar-results__message">{errorMessage(error)}</p> : null}
      {matched.length > 0 && (
        <section className="sidebar-results__group" aria-label={`Pastas: ${formatCount(matched.length)}`}>
          <div className="sidebar-results__label">Pastas · {formatCount(matched.length)}</div>
          <ul className="sidebar-results__list">
            {matched.map((folder) => (
              <li key={folder.id}>
                <button
                  type="button"
                  className="sidebar-row"
                  data-roving
                  tabIndex={-1}
                  onClick={() => onOpenFolder(folder.id)}
                >
                  <Folder size={16} />
                  <span className="sidebar-row__name">
                    <Highlight text={folder.name} query={query} />
                  </span>
                  <span className="sidebar-row__meta">{formatCount(folder.total)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {!error && (
        <section className="sidebar-results__group" aria-label={`Itens: ${formatCount(items.length)}`}>
          <div className="sidebar-results__label">Itens · {formatCount(items.length)}</div>
          <ul className="sidebar-results__list">
            {items.map((item) => {
              const Icon = icons[item.type];
              return (
                <li key={`${item.type}:${item.id}`}>
                  <Link
                    to={paths.item(projectId, item.type, item.id)}
                    className="sidebar-row sidebar-row--result"
                    data-roving
                    tabIndex={-1}
                  >
                    <Icon size={16} />
                    <span className="sidebar-row__name">
                      <Highlight text={displayTitle(item.title)} query={query} />
                    </span>
                    {item.folder && <span className="sidebar-row__folder">{item.folder.name}</span>}
                    {'excerpt' in item && item.excerpt && (
                      <span className="sidebar-row__excerpt">
                        <Highlight text={item.excerpt} query={query} />
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <button
        type="button"
        className="sidebar-row sidebar-results__everywhere"
        data-roving
        tabIndex={-1}
        onClick={() => ui.openPalette(query)}
      >
        <Search size={16} />
        <span className="sidebar-row__name">Buscar em todos os projetos</span>
        <span className="sidebar-row__meta">
          <Shortcut keys={KEYS.palette} />
        </span>
      </button>
    </div>
  );
}
