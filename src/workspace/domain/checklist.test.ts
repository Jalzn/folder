import { describe, expect, it } from 'vitest';
import { checklistProgress } from './checklist.js';
import type { DocumentBlock } from './document-models.js';

const item = (checked: boolean, children: DocumentBlock[] = []): DocumentBlock => ({
  type: 'checkListItem',
  props: { checked },
  content: [],
  children,
});

describe('checklist progress', () => {
  it('counts check items, nested ones included, and the checked ones', () => {
    const content: DocumentBlock[] = [
      { type: 'paragraph', content: [] },
      item(true, [item(false), item(true)]),
      { type: 'bulletListItem', content: [], children: [item(false)] },
      item(false),
    ];
    expect(checklistProgress(content)).toEqual({ done: 2, total: 5 });
  });

  it('is empty without check items, and full when all are checked', () => {
    expect(checklistProgress([])).toEqual({ done: 0, total: 0 });
    expect(checklistProgress([{ type: 'paragraph', content: [] }])).toEqual({ done: 0, total: 0 });
    expect(checklistProgress([item(true), item(true), item(true)])).toEqual({ done: 3, total: 3 });
  });
});
