import { describe, expect, it } from 'vitest';
import { highlightParts, matchesAllWords, queryWords } from './highlight';

const marked = (text: string, query: string) =>
  highlightParts(text, query)
    .filter((part) => part.match)
    .map((part) => part.text);

describe('highlightParts', () => {
  it('marks every word of the query, in any order, ignoring case and accents', () => {
    expect(marked('Visão do produto e visão geral', 'visao')).toEqual(['Visão', 'visão']);
    expect(marked('Gerar token pessoal no Perfil', 'perfil TOKEN')).toEqual(['token', 'Perfil']);
  });

  it('keeps the text whole and in order', () => {
    const parts = highlightParts('Notas de arquitetura', 'arqui');
    expect(parts.map((part) => part.text).join('')).toBe('Notas de arquitetura');
    expect(parts).toEqual([
      { text: 'Notas de ', match: false },
      { text: 'arqui', match: true },
      { text: 'tetura', match: false },
    ]);
  });

  it('ignores punctuation around the words and leaves text without a query alone', () => {
    expect(queryWords('"token pessoal" (MCP),')).toEqual(['token', 'pessoal', 'mcp']);
    expect(highlightParts('Sem busca', '  ')).toEqual([{ text: 'Sem busca', match: false }]);
    expect(highlightParts('', 'x')).toEqual([]);
  });
});

describe('matchesAllWords', () => {
  it('needs every word, in any order, ignoring case and accents', () => {
    expect(matchesAllWords('Notas de Arquitetura', 'arq notas')).toBe(true);
    expect(matchesAllWords('Ações do MCP', 'acoes mcp')).toBe(true);
    expect(matchesAllWords('Ações do MCP', 'acoes pasta')).toBe(false);
  });

  it('matches everything with an empty query', () => {
    expect(matchesAllWords('Qualquer', '')).toBe(true);
    expect(matchesAllWords('Qualquer', '  — ')).toBe(true);
  });
});
