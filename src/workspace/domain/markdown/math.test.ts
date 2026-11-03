import { describe, expect, it } from 'vitest';
import { displayMathLines, inlineMath, MATH_SEPARATOR, mathFence, needsMathSeparator } from './math.js';

describe('math fences', () => {
  it('uses one dollar more than the longest run inside', () => {
    expect(mathFence('x', false)).toBe('$');
    expect(mathFence('x', true)).toBe('$$');
    expect(mathFence('a $$ b', true)).toBe('$$$');
  });
  it('pads inline sources whose edges would merge with the fence', () => {
    expect(inlineMath('x^2')).toBe('$x^2$');
    expect(inlineMath('$x$')).toBe('$$ $x$ $$');
    expect(inlineMath(' x ')).toBe('$  x  $');
    expect(inlineMath('')).toBe('$ $');
    expect(inlineMath('a\r\nb')).toBe('$a b$');
  });
  it('keeps display sources on their own lines', () => {
    expect(displayMathLines('a\r\nb')).toEqual(['$$', 'a', 'b', '$$']);
  });
  it('separates only adjacent dollar fences', () => {
    expect(needsMathSeparator('$x$', '$y$')).toBe(true);
    expect(needsMathSeparator('$x$ ', '$y$')).toBe(false);
    expect(MATH_SEPARATOR).toBe('<!-- -->');
  });
});
