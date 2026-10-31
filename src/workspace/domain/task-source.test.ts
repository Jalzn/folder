import { describe, expect, it } from 'vitest';
import type { DocumentBlock } from './models.js';
import { excerptPresent } from './task-source.js';

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
