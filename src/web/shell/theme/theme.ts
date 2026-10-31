import { palette } from '../../styles/tokens/palette';

export type ThemeChoice = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

/** Per device and without the installation namespace, because the login screen follows it too. */
export const THEME_STORAGE_KEY = 'tinyfold:theme';

export const THEME_CHOICES: readonly ThemeChoice[] = ['system', 'light', 'dark'];

export const themeChoiceLabels: Record<ThemeChoice, string> = { system: 'Sistema', light: 'Claro', dark: 'Escuro' };

/** The browser bars take each theme's --bg, as public/theme.js sets them before the first paint. */
export const themeBarColors: Record<ResolvedTheme, string> = { light: palette.light.bg, dark: palette.dark.bg };

/** A stored choice, or "Sistema" for anything else. */
export function parseThemeChoice(value: string | null | undefined): ThemeChoice {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function resolveTheme(choice: ThemeChoice, systemPrefersDark: boolean): ResolvedTheme {
  if (choice === 'system') return systemPrefersDark ? 'dark' : 'light';
  return choice;
}
