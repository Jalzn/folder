import { describe, expect, it } from 'vitest';
import { searchTerms, searchText } from '#core/domain';

describe('search normalization', () => {
  it('ignores case and accents, keeping other characters literal', () => {
    expect(searchText('Ação RÁPIDA')).toBe('acao rapida');
    expect(searchText('100%_feito')).toBe('100%_feito');
  });
});

describe('search terms', () => {
  it('splits the normalized query into distinct words', () => {
    expect(searchTerms('  Ideia do  MCP ideia ')).toEqual(['ideia', 'do', 'mcp']);
    expect(searchTerms('́')).toEqual([]);
  });
  it('splits at spaces and dashes and drops the punctuation around words', () => {
    expect(searchTerms('"token pessoal"')).toEqual(['token', 'pessoal']);
    expect(searchTerms('(MCP), «Ação»… token-pessoal — fim')).toEqual(['mcp', 'acao', 'token', 'pessoal', 'fim']);
    expect(searchTerms('v1.2 C++ R$ 100% #12')).toEqual(['v1.2', 'c++', 'r$', '100', '12']);
    expect(searchTerms('" ... --')).toEqual([]);
  });
});
