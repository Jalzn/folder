import { planEmphasis } from './markdown-emphasis.js';
import { fenceFor } from './markdown-fence.js';
import { ESCAPED_ANYWHERE, type Inline, inlineItems, type LineBreaks, type Mark } from './markdown-items.js';
import { inlineMath, MATH_SEPARATOR, needsMathSeparator } from './markdown-math.js';
import type { JsonValue } from './models.js';

/**
 * Inline BlockNote content as Markdown. Line breaks become `\` hard breaks by default; `html`
 * writes `<br>` where the line must not end and `space` joins the lines (headings). `lineStart`
 * says whether the text begins a line, where block markers need escaping.
 */
export function inlineMarkdown(
  content: JsonValue | undefined,
  options: { lineStart: boolean; breaks?: LineBreaks },
): string {
  return renderInline(inlineItems(content, options.breaks ?? 'hard'), options.lineStart, []);
}

/** Writes the emphasis plan: delimiters, the spaces kept outside them, then each piece. */
function renderInline(items: readonly Inline[], lineStart: boolean, inherited: readonly Mark[]): string {
  const { steps, end } = planEmphasis(items, inherited);
  const output: string[] = [];
  // The last written piece, so checks on the output's end stay constant-time.
  let last = '';
  const write = (piece: string) => {
    if (!piece) return;
    output.push(piece);
    last = piece;
  };
  let atLineStart = lineStart;
  for (const step of steps) {
    if (step.close.length || step.open.length) atLineStart = false;
    write(step.close.join(''));
    write(step.spaces);
    write(step.open.join(''));
    const { item } = step;
    if (item.kind === 'text') write(item.code ? codeSpan(item.text) : escapeText(step.text, atLineStart));
    else if (item.kind === 'link') write(renderLink(item, step.around));
    else if (item.kind === 'break') write(item.text);
    else {
      const formula = inlineMath(item.source);
      write(needsMathSeparator(last, formula) ? `${MATH_SEPARATOR}${formula}` : formula);
    }
    atLineStart = item.kind === 'break' && item.text.endsWith('\n');
  }
  write(end.join(''));
  return output.join('');
}

function renderLink(link: Extract<Inline, { kind: 'link' }>, around: readonly Mark[]): string {
  const label = link.content.length ? renderInline(link.content, false, around) : escapeText(link.href, false);
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
 * Escapes what would start emphasis, code, links, math or strikethrough anywhere, and block markers
 * at a line start. Only characters that both CommonMark and the BlockNote parser unescape are used;
 * `<` and `&` stay literal because BlockNote has no escape for them.
 */
function escapeText(text: string, lineStart: boolean): string {
  const escaped = text.replace(new RegExp(ESCAPED_ANYWHERE.source, 'gu'), '\\$&');
  if (!lineStart) return escaped;
  // A line of only `=` below a paragraph line would turn that line into a heading.
  if (/^[ \t]*=+[ \t]*$/u.test(escaped)) return escaped.replace('=', '\\=');
  return escaped.replace(/^([ \t]*)(?:([#>+|-])|(\d{1,9})([.)]))/u, (_match, space, marker, digits, delimiter) =>
    marker ? `${space}\\${marker}` : `${space}${digits}\\${delimiter}`,
  );
}
