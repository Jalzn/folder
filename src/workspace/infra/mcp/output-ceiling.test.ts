import { describe, expect, it } from 'vitest';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import { withinTextCeiling } from './output-ceiling.js';

const ceiling = READING_LIMITS.toolTextChars;
const image = { type: 'image', data: 'AA==', mimeType: 'image/png' } as const;

describe('output ceiling', () => {
  it('leaves results within the ceiling as they are', () => {
    const result = { content: [{ type: 'text', text: 'x'.repeat(ceiling) } as const, image] };
    expect(withinTextCeiling(result)).toEqual(result);
  });
  it('cuts the text that passes it, counting every text block, and keeps images', () => {
    const cut = withinTextCeiling({
      content: [
        { type: 'text', text: 'a'.repeat(ceiling - 100) },
        image,
        { type: 'text', text: `${'😀'.repeat(200)}` },
        { type: 'text', text: 'depois' },
      ],
      isError: true,
    });
    const texts = cut.content.flatMap((block) => (block.type === 'text' ? [block.text] : []));
    expect(texts.join('').length).toBeLessThanOrEqual(ceiling);
    expect(texts).toHaveLength(2);
    expect(texts[1]?.endsWith(`… resposta cortada em ${ceiling.toLocaleString('pt-BR')} caracteres.`)).toBe(true);
    expect(texts[1]?.isWellFormed()).toBe(true);
    expect(cut.content).toContainEqual(image);
    expect(cut.isError).toBe(true);
  });
});
