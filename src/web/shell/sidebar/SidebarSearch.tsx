import { Search } from 'lucide-react';
import type { KeyboardEvent, RefObject } from 'react';
import { Kbd } from '../../ui';
import { isComposing } from '../keyboard/guards';

/**
 * Buscar: a row of the navigation that turns into a field in place when clicked or with `/`. With text it
 * filters the project; in the field, the first Esc clears it and nothing else (not even the sidebar over
 * the page), the second returns focus to the page. An Esc elsewhere leaves the text alone.
 */
export function SidebarSearch({
  projectName,
  query,
  onQueryChange,
  onOpenFirst,
  onArrowDown,
  inputRef,
}: {
  projectName: string;
  query: string;
  onQueryChange: (query: string) => void;
  onOpenFirst: () => void;
  /** ↓ in the field: to the first result. */
  onArrowDown: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Keys that confirm or cancel an IME composition belong to it.
    if (isComposing(event.nativeEvent)) return;
    if (event.key === 'Escape' && query) {
      event.preventDefault();
      event.stopPropagation();
      onQueryChange('');
    } else if (event.key === 'Enter') {
      event.preventDefault();
      onOpenFirst();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      onArrowDown();
    }
  }
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
