import type { DocumentBlock } from './document-models.js';

/** How many check items a description has and how many are checked, nested ones included. */
export function checklistProgress(content: readonly DocumentBlock[]): { done: number; total: number } {
  let done = 0;
  let total = 0;
  const visit = (blocks: readonly DocumentBlock[]) => {
    for (const block of blocks) {
      if (block.type === 'checkListItem') {
        total += 1;
        if (block.props?.checked === true) done += 1;
      }
      if (block.children?.length) visit(block.children);
    }
  };
  visit(content);
  return { done, total };
}
