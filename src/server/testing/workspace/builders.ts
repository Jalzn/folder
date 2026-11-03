import { randomUUID } from 'node:crypto';
import type { DocumentBlock } from '@tinyfold/rich-text/domain';

/** A write's request ID, new each time. */
export const request = () => ({ requestId: randomUUID() });

/** A paragraph block with the text, and the block ID when given. */
export const paragraph = (text: string, id?: string): DocumentBlock => ({
  ...(id ? { id } : {}),
  type: 'paragraph',
  content: [{ type: 'text', text, styles: {} }],
});

/** A checklist item. */
export const check = (text: string, checked: boolean): DocumentBlock => ({
  type: 'checkListItem',
  props: { checked },
  content: [{ type: 'text', text, styles: {} }],
});
