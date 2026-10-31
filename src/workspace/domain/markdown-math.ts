import { fenceFor } from './markdown-fence.js';

/**
 * Markdown fences for LaTeX, shared by the server serializer and the web `.md` export.
 * Sources are written raw, so incomplete formulas survive a round trip.
 */

/** An empty HTML comment keeps adjacent dollar fences from merging into one delimiter run. */
export const MATH_SEPARATOR = '<!-- -->';

const normalizeLineEndings = (source: string) => source.replace(/\r\n?/gu, '\n');

/** One dollar more than the longest run inside, with at least `$` inline and `$$` for display. */
export function mathFence(source: string, display: boolean): string {
  return fenceFor(source, '$', display ? 2 : 1);
}

/** The fenced inline formula. Markdown turns inline line endings into spaces. */
export function inlineMath(source: string): string {
  let inline = normalizeLineEndings(source).replaceAll('\n', ' ');
  if (!inline) inline = ' ';
  // Padding keeps a dollar at either end, or one pair of edge spaces, from being read as part of the fence.
  if (/^\$|\$$/u.test(inline) || (/[^ ]/u.test(inline) && inline.startsWith(' ') && inline.endsWith(' ')))
    inline = ` ${inline} `;
  const fence = mathFence(inline, false);
  return `${fence}${inline}${fence}`;
}

/** The fence and source lines of a display formula; the caller adds any container prefix to each line. */
export function displayMathLines(source: string): string[] {
  const normalized = normalizeLineEndings(source);
  const fence = mathFence(normalized, true);
  return [fence, ...normalized.split('\n'), fence];
}

/** Whether `MATH_SEPARATOR` must sit between two pieces of Markdown. */
export function needsMathSeparator(before: string, after: string): boolean {
  return before.endsWith('$') && after.startsWith('$');
}
