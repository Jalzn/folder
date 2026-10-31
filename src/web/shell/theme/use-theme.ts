import { useSyncExternalStore } from 'react';
import { useToast } from '../../ui';
import {
  parseThemeChoice,
  type ResolvedTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemeChoice,
  themeBarColors,
  themeChoiceLabels,
} from './theme';

interface ThemeState {
  choice: ThemeChoice;
  resolved: ResolvedTheme;
}

const darkQuery = '(prefers-color-scheme: dark)';
const listeners = new Set<() => void>();

function readChoice(): ThemeChoice {
  try {
    return parseThemeChoice(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'system';
  }
}

function stateFor(choice: ThemeChoice): ThemeState {
  return { choice, resolved: resolveTheme(choice, matchMedia(darkQuery).matches) };
}

/** The same work as public/theme.js, which already ran before the first paint. */
function apply({ resolved }: ThemeState) {
  document.documentElement.dataset.theme = resolved;
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'))
    meta.content = themeBarColors[resolved];
}

let state = stateFor(readChoice());

function update(next: ThemeState) {
  if (next.choice === state.choice && next.resolved === state.resolved) return;
  state = next;
  apply(state);
  for (const listener of listeners) listener();
}

/** A change of the system theme, or of the choice in another tab. */
const sync = () => update(stateFor(readChoice()));
const syncStorage = (event: StorageEvent) => {
  if (event.key === THEME_STORAGE_KEY || event.key === null) sync();
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    matchMedia(darkQuery).addEventListener('change', sync);
    window.addEventListener('storage', syncStorage);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      matchMedia(darkQuery).removeEventListener('change', sync);
      window.removeEventListener('storage', syncStorage);
    }
  };
}

/** Keeps the choice on this device; it lasts until the page closes when storage is blocked. */
export function setThemeChoice(choice: ThemeChoice) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Storage blocked.
  }
  update(stateFor(choice));
}

/**
 * The theme choice (Sistema, Claro or Escuro) and the theme it resolves to now. `choose` keeps a choice the
 * person made and confirms it with a toast, the same from the Você menu, ⌘K and Perfil.
 */
export function useTheme() {
  const current = useSyncExternalStore(subscribe, () => state);
  const toast = useToast();
  function choose(choice: ThemeChoice) {
    setThemeChoice(choice);
    toast(`Tema: ${themeChoiceLabels[choice]}.`);
  }
  return { choice: current.choice, resolved: current.resolved, choose };
}
