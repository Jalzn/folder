import { describe, expect, it } from 'vitest';
import { excerptAround } from './excerpt.js';
import { searchTerms } from './search-text.js';

const excerpt = (text: string, query = '') => excerptAround(text, searchTerms(query), 40, 10);

describe('search excerpt', () => {
  it('starts a little before the first match and marks both cut ends', () => {
    const text = `${'a'.repeat(100)} alvo ${'b'.repeat(100)}`;
    expect(excerpt(text, 'ALVO')).toBe(`…${'a'.repeat(8)} alvo ${'b'.repeat(24)}…`);
    expect(excerpt('curto', 'curto')).toBe('curto');
    expect(excerpt(`${'x'.repeat(50)}`)).toBe(`${'x'.repeat(39)}…`);
  });
  it('finds the match after stripped variation selectors and decomposed accents', () => {
    expect(excerpt(`${'❤️'.repeat(200)} alvo-emoji fim`, 'alvo-emoji')).toContain('alvo-emoji');
    const decomposed = `${'ação '.normalize('NFD').repeat(200)}ALVO-FINAL`;
    expect(excerpt(decomposed, 'alvo-final')).toContain('ALVO-FINAL');
  });
  it('never splits a surrogate pair', () => {
    for (const text of [`${'😀'.repeat(60)} alvo ${'😀'.repeat(60)}`, `x${'😀'.repeat(60)}`]) {
      const value = excerpt(text, 'alvo');
      expect(value.isWellFormed()).toBe(true);
      expect(Array.from(value).length).toBeLessThanOrEqual(40);
    }
  });
});

describe('search terms', () => {
  it('splits the normalized query into distinct words', () => {
    expect(searchTerms('  Ideia do  MCP ideia ')).toEqual(['ideia', 'do', 'mcp']);
    expect(searchTerms('́')).toEqual([]);
  });
});
