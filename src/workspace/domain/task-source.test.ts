import { describe, expect, it } from 'vitest';
import type { DocumentBlock } from './document-models.js';
import { excerptEnd, excerptPresent } from './task-source.js';

const paragraph = (id: string, text: string): DocumentBlock => ({
  id,
  type: 'paragraph',
  content: [{ type: 'text', text, styles: {} }],
});

describe('task source excerpt', () => {
  const content = [paragraph('first', 'Gerar   token\npessoal'), paragraph('second', 'Revogar no Perfil')];
  const document = { content, plainText: 'Gerar   token\npessoal\nRevogar no Perfil' };

  it('finds the excerpt in the anchored block, ignoring whitespace changes', () => {
    expect(excerptPresent(document, 'first', 'Gerar token pessoal')).toBe(true);
    expect(excerptPresent(document, 'first', 'Revogar')).toBe(false);
  });
  it('searches the whole document without an anchor and fails for a removed block', () => {
    expect(excerptPresent(document, null, 'pessoal Revogar')).toBe(true);
    expect(excerptPresent(document, 'missing', 'Gerar')).toBe(false);
  });
});

describe('excerpt end', () => {
  it('points just after the excerpt, across collapsed spaces and line breaks', () => {
    const text = 'Gerar   token\npessoal no Perfil';
    expect(excerptEnd(text, 'Gerar token pessoal')).toBe('Gerar   token\npessoal'.length);
    expect(excerptEnd(text, '  token   pessoal ')).toBe('Gerar   token\npessoal'.length);
    expect(excerptEnd(text, 'Perfil')).toBe(text.length);
  });

  it('takes the first of a repeated excerpt and gives up on an absent or empty one', () => {
    expect(excerptEnd('ok, ok, ok', 'ok')).toBe(2);
    expect(excerptEnd('Gerar token', 'Revogar')).toBeUndefined();
    expect(excerptEnd('Gerar token', '   ')).toBeUndefined();
  });

  it('counts formatted text as the block text it is, emoji included', () => {
    // The block's text, as its formatted pieces read joined: **Gerar** _token_ 👍🏽 pessoal.
    const text = 'Gerar token 👍🏽 pessoal';
    expect(excerptEnd(text, 'token 👍🏽')).toBe('Gerar token 👍🏽'.length);
  });
});
