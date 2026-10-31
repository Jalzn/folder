import { describe, expect, it } from 'vitest';
import { planEmphasis } from './markdown-emphasis.js';
import type { Inline, Mark } from './markdown-items.js';

const text = (value: string, ...marks: Mark[]): Inline => ({ kind: 'text', text: value, marks, code: false });
const shape = (items: Inline[]) =>
  planEmphasis(items, []).steps.map(({ close, spaces, open, text: core }) => ({ close, spaces, open, core }));

describe('emphasis plan', () => {
  it('moves edge spaces outside the delimiters', () => {
    expect(shape([text('a '), text(' forte ', 'bold'), text('fim')])).toEqual([
      { close: [], spaces: '', open: [], core: 'a' },
      { close: [], spaces: '  ', open: ['**'], core: 'forte' },
      { close: ['**'], spaces: ' ', open: [], core: 'fim' },
    ]);
  });
  it('opens the longer mark outside, so it survives the end of the shorter one', () => {
    expect(shape([text('a', 'bold', 'italic'), text('b', 'italic'), text(' c')])).toEqual([
      { close: [], spaces: '', open: ['_', '**'], core: 'a' },
      { close: ['**'], spaces: '', open: [], core: 'b' },
      { close: ['_'], spaces: ' ', open: [], core: 'c' },
    ]);
  });
  it('uses asterisks for italic inside a word, tags where no delimiter works, and closes at the end', () => {
    const plan = planEmphasis([text('re'), text('escre', 'italic'), text('ver'), text('!', 'bold')], []);
    expect(plan.steps.map((step) => step.open)).toEqual([[], ['*'], [], ['<strong>']]);
    expect(plan.end).toEqual(['</strong>']);
  });
});
