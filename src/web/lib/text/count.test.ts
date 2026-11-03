import { describe, expect, it } from 'vitest';
import { countOf, formatCount } from './count';

describe('counts', () => {
  it('groups thousands the Brazilian way', () => {
    expect(formatCount(999)).toBe('999');
    expect(formatCount(1000)).toBe('1.000');
    expect(formatCount(1234567)).toBe('1.234.567');
  });

  it('names one in the singular and the rest in the plural', () => {
    expect(countOf(1, 'item', 'itens')).toBe('1 item');
    expect(countOf(0, 'item', 'itens')).toBe('0 itens');
    expect(countOf(1200, 'item', 'itens')).toBe('1.200 itens');
  });
});
