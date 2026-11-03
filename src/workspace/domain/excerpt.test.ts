import { describe, expect, it } from 'vitest';
import { searchTerms } from '#core/domain';
import { documentLead } from '#rich-text/domain';
import { excerptAround, excerptFromStart } from './excerpt.js';
import * as domain from './index.js';

const excerpt = (text: string, query = '') => excerptAround(text, searchTerms(query), 40, 10);
const line = (text: string) => excerptAround(text, [], 240, 0);

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
  it('marks the ends of a text that was itself cut out of a longer one', () => {
    expect(excerptAround('meio do texto', [], 40, 10, { before: true, after: true })).toBe('…eio do texto…');
    expect(excerptAround('meio do texto', [], 40, 10, { before: false, after: true })).toBe('meio do texto…');
    expect(excerptAround('x'.repeat(50), [], 40, 10, { before: false, after: true })).toBe(`${'x'.repeat(39)}…`);
  });
  it('puts the lines of a text, as blocks of a document or texts of a drawing, on one line with commas', () => {
    expect(line('Por que existe\nUm espaço pessoal e minimalista')).toBe(
      'Por que existe, Um espaço pessoal e minimalista',
    );
    expect(line('Edição\nRascunho local\n\n \t\nServidor\r\nConflito?')).toBe(
      'Edição, Rascunho local, Servidor, Conflito?',
    );
    // A piece that ends in punctuation needs no comma after it.
    expect(line('Fim da frase.\nOutra   frase\nPergunta?\nResposta:\nlista')).toBe(
      'Fim da frase. Outra frase, Pergunta? Resposta: lista',
    );
    expect(line('\n\n  ')).toBe('');
  });
  it('looks for the match and counts the lead on the joined line', () => {
    expect(excerpt(`Título\n${'a'.repeat(20)}\nalvo`, 'alvo')).toBe(`…${'a'.repeat(7)}, alvo`);
    expect(excerpt('Plano\nalvo no segundo bloco', 'alvo')).toBe('Plano, alvo no segundo bloco');
  });
  it('starts an excerpt at the beginning of a text of any length', () => {
    expect(excerptFromStart('Curto\ntexto', 40)).toBe('Curto, texto');
    expect(excerptFromStart('x'.repeat(100_000), 40)).toBe(`${'x'.repeat(39)}…`);
    // Only spaces after the part it reads do not count as more text; a cut source does.
    expect(excerptFromStart(`Curto${' '.repeat(1_000)}`, 40)).toBe('Curto');
    expect(excerptFromStart('Curto', 40, true)).toBe('Curto…');
  });
  it('never splits a surrogate pair', () => {
    for (const text of [`${'😀'.repeat(60)} alvo ${'😀'.repeat(60)}`, `x${'😀'.repeat(60)}`]) {
      const value = excerpt(text, 'alvo');
      expect(value.isWellFormed()).toBe(true);
      expect(Array.from(value).length).toBeLessThanOrEqual(40);
    }
  });
  it('gives, through the public entry, the overview excerpt of a document and a drawing', () => {
    const text = (value: string) => [{ type: 'text', text: value, styles: {} }];
    const blocks = [
      { type: 'heading', content: text('Por que existe') },
      { type: 'paragraph', content: text('Espaço pessoal e minimalista.') },
    ];
    const { excerptChars } = domain.NAVIGATION_LIMITS.overview;
    expect(domain.excerptFromStart(documentLead(blocks), excerptChars)).toBe('Espaço pessoal e minimalista.');
    expect(domain.excerptFromStart('Edição\nRascunho local\nServidor', excerptChars)).toBe(
      'Edição, Rascunho local, Servidor',
    );
  });
});
