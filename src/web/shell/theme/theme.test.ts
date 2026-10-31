import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseThemeChoice, resolveTheme, THEME_STORAGE_KEY, themeBarColors } from './theme';

describe('theme', () => {
  it('reads a stored choice and falls back to the system', () => {
    expect(parseThemeChoice('light')).toBe('light');
    expect(parseThemeChoice('dark')).toBe('dark');
    expect(parseThemeChoice('system')).toBe('system');
    expect(parseThemeChoice(null)).toBe('system');
    expect(parseThemeChoice('Dark')).toBe('system');
    expect(parseThemeChoice('')).toBe('system');
  });

  it('resolves the system choice with the media query and keeps an explicit one', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('shares the key and the bar colours with public/theme.js, which runs before the app', () => {
    const script = readFileSync(new URL('../../public/theme.js', import.meta.url), 'utf8');
    expect(script).toContain(`localStorage.getItem('${THEME_STORAGE_KEY}')`);
    expect(script).toContain(`light: '${themeBarColors.light}', dark: '${themeBarColors.dark}'`);
  });
});
