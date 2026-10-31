import { describe, expect, it } from 'vitest';
import { searchText } from './search-text.js';

describe('search normalization', () => {
  it('ignores case and accents, keeping other characters literal', () => {
    expect(searchText('Ação RÁPIDA')).toBe('acao rapida');
    expect(searchText('100%_feito')).toBe('100%_feito');
  });
});
