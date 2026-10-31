import { pageText, type TextPage } from './paging.js';

/** A fenced block left open: code with backticks, or a display formula with dollars. */
interface OpenBlock {
  indent: string;
  fence: string;
  /** The code language on the opening line. */
  info: string;
}

const codeFence = /^([ \t]*)(`{3,})([^`]*)$/u;
const mathFence = /^([ \t]*)(\${2,})[ \t]*$/u;

/** A line of only the fence's character, at least as long as the fence, closes the block. */
function closes(block: OpenBlock, line: string): boolean {
  const run = line.trim();
  return run.length >= block.fence.length && run === (block.fence[0] as string).repeat(run.length);
}

/**
 * The block still open after `lines`, as the serializer writes them. Inside a block only its own
 * closing fence counts, so backticks in a formula or dollars in code are content.
 */
function openBlockAfter(lines: readonly string[], initial: OpenBlock | undefined): OpenBlock | undefined {
  let open = initial;
  for (const line of lines) {
    if (open) {
      if (closes(open, line)) open = undefined;
      continue;
    }
    const match = codeFence.exec(line) ?? mathFence.exec(line);
    if (match) open = { indent: match[1] ?? '', fence: match[2] ?? '', info: match[3] ?? '' };
  }
  return open;
}

/** Moves the block's lines from `from` up to its closing fence to column 0. */
function dedentBlock(lines: string[], from: number, block: OpenBlock): void {
  for (let index = from; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (line.startsWith(block.indent)) lines[index] = line.slice(block.indent.length);
    if (closes(block, line)) return;
  }
}

/**
 * A page of Markdown as in pageText, where a code block or display formula cut by the page is
 * closed at its end and reopened at the start of the next. A block nested in a list reopens at
 * column 0, its lines on that page dedented, since four spaces of indentation at the top of a page
 * would make an indented code block. Page boundaries, and so cursors, do not change.
 */
export function pageMarkdown(markdown: string, offset: number, maxChars: number): TextPage {
  const page = pageText(markdown, offset, maxChars);
  // The last piece before the page is empty, or the start of a long line the page cut.
  const before = openBlockAfter(markdown.slice(0, offset).split('\n').slice(0, -1), undefined);
  const lines = page.text.split('\n');
  // A page that starts mid-line starts with the rest of that line: content, never a fence.
  const first = offset > 0 && markdown[offset - 1] !== '\n' ? 1 : 0;
  if (before) dedentBlock(lines, first, before);
  const after = openBlockAfter(lines.slice(first), before && { ...before, indent: '' });
  let text = lines.join('\n');
  if (before) text = `${before.fence}${before.info}\n${text}`;
  if (after) text = `${text}${text.endsWith('\n') ? '' : '\n'}${after.indent}${after.fence}\n`;
  return { ...page, text };
}
