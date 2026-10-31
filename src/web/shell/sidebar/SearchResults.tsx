import { Link } from '@tanstack/react-router';
import { FileText, Search, Shapes } from 'lucide-react';
import { errorMessage } from '../../lib/api';
import type { SearchResult } from '../../lib/queries';
import { displayTitle, type ItemType } from '../../lib/types';
import { paths } from '../../router/paths';
import { Highlight, Shortcut } from '../../ui';
import { useShellUi } from '../shell-ui';

const groups: { type: ItemType; label: string; icon: typeof FileText }[] = [
  { type: 'document', label: 'Documentos', icon: FileText },
  { type: 'drawing', label: 'Desenhos', icon: Shapes },
];

/**
 * The sidebar's results in place of its sections: Documentos and Desenhos with their counts, each with its
 * excerpt and the terms in bold, and always "Buscar em todos os projetos", which takes the text to ⌘K.
 */
export function SearchResults({
  projectId,
  query,
  results,
  error,
}: {
  projectId: string;
  query: string;
  results: SearchResult[] | undefined;
  error: unknown;
}) {
  const ui = useShellUi();
  return (
    <div className="sidebar-results">
      {error ? <p className="sidebar-results__message">{errorMessage(error)}</p> : null}
      {!error &&
        groups.map(({ type, label, icon: Icon }) => {
          const items = (results ?? []).filter((result) => result.type === type);
          return (
            <section key={type} className="sidebar-results__group" aria-label={`${label}: ${items.length}`}>
              <div className="sidebar-results__label">
                {label} · {items.length}
              </div>
              <ul className="sidebar-section__list">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={paths.item(projectId, type, item.id)}
                      className="sidebar-row sidebar-row--result"
                      data-roving
                      tabIndex={-1}
                    >
                      <Icon size={16} />
                      <span className="sidebar-row__name">
                        <Highlight text={displayTitle(item.title)} query={query} />
                      </span>
                      {'excerpt' in item && item.excerpt && (
                        <span className="sidebar-row__excerpt">
                          <Highlight text={item.excerpt} query={query} />
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
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
          <Shortcut keys={['mod', 'K']} />
        </span>
      </button>
    </div>
  );
}
