import { pageText, type TextPage } from './paging.js';

interface OpenFence {
  /** The fence line as written, with its indentation and language. */
  opening: string;
  /** The line that closes it. */
  closing: string;
}

/** A backtick fence line: indentation, the fence and, on an opening line, a language. */
const fenceLine = /^([ \t]*)(`{3,})([^`]*)$/u;

/** The code fence still open after `lines`, as the serializer writes them. */
function openFenceAfter(lines: readonly string[], initial: OpenFence | undefined): OpenFence | undefined {
  let open = initial;
  for (const line of lines) {
    const match = fenceLine.exec(line);
    if (!match) continue;
    const [, indent = '', fence = '', info = ''] = match;
    if (!open) open = { opening: line, closing: `${indent}${fence}` };
    else if (!info.trim() && line.trim().length >= open.closing.trim().length) open = undefined;
  }
  return open;
}

/**
 * A page of Markdown as in pageText, with a code block cut by the page closed at its end and
 * reopened at the start of the next page, so every page reads as complete Markdown.
 */
export function pageMarkdown(markdown: string, offset: number, maxChars: number): TextPage {
  const page = pageText(markdown, offset, maxChars);
  const before = openFenceAfter(markdown.slice(0, offset).split('\n'), undefined);
  const after = openFenceAfter(page.text.split('\n'), before);
  let text = page.text;
  if (before) text = `${before.opening}\n${text}`;
  if (after) text = `${text}${text.endsWith('\n') ? '' : '\n'}${after.closing}\n`;
  return { ...page, text };
}
