import type { JsonValue } from '#core/domain';
import { planEmphasis } from './emphasis.js';
import { fenceFor } from './fence.js';
import { ESCAPED_ANYWHERE, type Inline, inlineItems, type LineBreaks, type Mark } from './items.js';
import { inlineMath, MATH_SEPARATOR, needsMathSeparator } from './math.js';

/**
 * Inline BlockNote content as Markdown. Line breaks become `\` hard breaks by default; `html`
 * writes `<br>` where the line must not end and `space` joins the lines (headings). `lineStart`
 * says whether the text begins a line, where block markers need escaping.
 */
export function inlineMarkdown(
  content: JsonValue | undefined,
  options: { lineStart: boolean; breaks?: LineBreaks },
): string {
  return renderInline(inlineItems(content, options.breaks ?? 'hard'), options.lineStart ? 'block' : 'inline', []);
}

/** Where a text piece begins: inside a line, at a block's start, or at a line start after a hard break. */
type TextStart = 'inline' | 'block' | 'break';

/** Writes the emphasis plan: delimiters, the spaces kept outside them, then each piece. */
function renderInline(items: readonly Inline[], blockStart: TextStart, inherited: readonly Mark[]): string {
  const { steps, end } = planEmphasis(items, inherited);
  const output: string[] = [];
  // The last written piece, so checks on the output's end stay constant-time.
  let last = '';
  const write = (piece: string) => {
    if (!piece) return;
    output.push(piece);
    last = piece;
  };
  let start = blockStart;
  for (const [index, step] of steps.entries()) {
    if (step.close.length || step.open.length) start = 'inline';
    write(step.close.join(''));
    write(step.spaces);
    write(step.open.join(''));
    const { item } = step;
    const next = steps[index + 1];
    const touchesLink = next?.item.kind === 'link' && !next.close.length && !next.spaces && !next.open.length;
    if (item.kind === 'text') write(item.code ? codeSpan(item.text) : escapeText(step.text, start, touchesLink));
    else if (item.kind === 'link') write(renderLink(item, step.around));
    else if (item.kind === 'break') write(item.text);
    else {
      const formula = inlineMath(item.source);
      write(needsMathSeparator(last, formula) ? `${MATH_SEPARATOR}${formula}` : formula);
    }
    start = item.kind === 'break' && item.text.endsWith('\n') ? 'break' : 'inline';
  }
  write(end.join(''));
  return output.join('');
}

function renderLink(link: Extract<Inline, { kind: 'link' }>, around: readonly Mark[]): string {
  const label = link.content.length ? renderInline(link.content, 'inline', around) : escapeText(link.href, 'inline');
  return `[${label}](${linkDestination(link.href)})`;
}

/**
 * The address as written: bare when a Markdown reader takes it unchanged, otherwise between angle
 * brackets, which allow spaces, with `\`, `<` and `>` escaped. Unbalanced parentheses are escaped
 * in either form, since the BlockNote parser pairs them even inside angle brackets.
 */
function linkDestination(href: string): string {
  const angle = /[\s\\<>]/u.test(href);
  let destination = angle ? href.replace(/[\\<>]/gu, '\\$&') : href;
  if (!parenthesesBalanced(href)) destination = destination.replace(/[()]/gu, '\\$&');
  return angle ? `<${destination}>` : destination;
}

function parenthesesBalanced(text: string): boolean {
  let depth = 0;
  for (const character of text) {
    if (character === '(') depth += 1;
    else if (character === ')' && --depth < 0) return false;
  }
  return depth === 0;
}

function codeSpan(text: string): string {
  const fence = fenceFor(text, '`', 1);
  const padded = /^`|`$/u.test(text) || (/[^ ]/u.test(text) && text.startsWith(' ') && text.endsWith(' '));
  return `${fence}${padded ? ` ${text} ` : text}${fence}`;
}

/**
 * Whether the line is a GFM table delimiter row, such as `:--|--:`, which makes the line above it
 * a table header. Split by hand: one regex for the whole row backtracks quadratically on spaces.
 */
function isTableDelimiterRow(line: string): boolean {
  if (!/^[ \t|:-]+$/u.test(line)) return false;
  const cells = line.trim().replace(/^\|/u, '').replace(/\|$/u, '').split('|');
  return cells.every((cell) => /^:?-+:?$/u.test(cell.trim()));
}

/**
 * Escapes what would start emphasis, code, links, math or strikethrough anywhere, and block markers
 * at a line start. After a hard break it also escapes the lines that would restructure the line
 * above: a setext underline or a table delimiter row. Before a link, a final `!` would make it an
 * image. Only characters that both CommonMark and the BlockNote parser unescape are used; `<` and
 * `&` stay literal because BlockNote has no escape for them.
 */
function escapeText(text: string, start: TextStart, beforeLink = false): string {
  let escaped = text.replace(new RegExp(ESCAPED_ANYWHERE.source, 'gu'), '\\$&');
  if (beforeLink && escaped.endsWith('!')) escaped = `${escaped.slice(0, -1)}\\!`;
  if (start === 'inline') return escaped;
  if (start === 'break' && /^[ \t]*=+[ \t]*$/u.test(escaped)) return escaped.replace('=', '\\=');
  if (start === 'break' && isTableDelimiterRow(escaped)) escaped = escaped.replace('-', '\\-');
  return escaped.replace(/^([ \t]*)(?:([#>+|-])|(\d{1,9})([.)]))/u, (_match, space, marker, digits, delimiter) =>
    marker ? `${space}\\${marker}` : `${space}${digits}\\${delimiter}`,
  );
}
