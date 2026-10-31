import { Search } from 'lucide-react';
import { type KeyboardEvent, type RefObject, useCallback, useEffect } from 'react';
import { Kbd } from '../../ui';
import { useLayer } from '../keyboard/use-layer';

/**
 * Buscar: a row of the navigation that turns into a field in place when clicked or with `/`. With text it
 * filters the project; the first Esc clears it, the second returns focus to the page.
 */
export function SidebarSearch({
  projectName,
  query,
  onQueryChange,
  onOpenFirst,
  inputRef,
}: {
  projectName: string;
  query: string;
  onQueryChange: (query: string) => void;
  onOpenFirst: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const clear = useCallback(() => {
    onQueryChange('');
    inputRef.current?.focus();
  }, [onQueryChange, inputRef]);
  useLayer('sidebar-search', query !== '', clear);
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape' && query) {
      event.preventDefault();
      onQueryChange('');
    } else if (event.key === 'Enter') {
      event.preventDefault();
      onOpenFirst();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.currentTarget.closest('.sidebar')?.querySelector<HTMLElement>('.sidebar-results [data-roving]')?.focus();
    }
  }
  useEffect(() => {
    if (!query) return;
    // Results replace the sections: the list starts again at the top.
    inputRef.current?.closest('.sidebar')?.querySelector('.sidebar__sections')?.scrollTo({ top: 0 });
  }, [query, inputRef]);
  return (
    <div className="sidebar-search">
      <Search className="sidebar-search__icon" size={16} aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        className="sidebar-search__input"
        placeholder="Buscar"
        aria-label={`Buscar em ${projectName}`}
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={keyDown}
      />
      <span className="sidebar-search__key" aria-hidden="true">
        <Kbd>{query ? 'esc' : '/'}</Kbd>
      </span>
    </div>
  );
}
