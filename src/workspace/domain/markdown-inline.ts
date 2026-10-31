import { inlineMath, MATH_SEPARATOR, needsMathSeparator } from './markdown-math.js';
import type { JsonValue } from './models.js';

/**
 * Inline BlockNote content as Markdown. Line breaks become `\` hard breaks, or spaces where a hard
 * break cannot exist (headings). `lineStart` says whether the text begins a line, where block
 * markers need escaping.
 */
export function inlineMarkdown(
  content: JsonValue | undefined,
  options: { lineStart: boolean; breaksAsSpaces?: boolean },
): string {
  return renderInline(inlineItems(content, options.breaksAsSpaces ?? false), options.lineStart, []);
}

type Mark = 'bold' | 'italic' | 'strike';
const marks: readonly Mark[] = ['bold', 'italic', 'strike'];

type Inline =
  | { kind: 'text'; text: string; marks: Mark[]; code: boolean }
  | { kind: 'link'; href: string; content: Inline[] }
  | { kind: 'math'; source: string }
  | { kind: 'break' };

const record = (value: unknown): value is { [key: string]: JsonValue } =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const sameMarks = (a: readonly Mark[], b: readonly Mark[]) =>
  a.length === b.length && a.every((mark) => b.includes(mark));

/** Splits text at line breaks and merges neighbors whose Markdown formatting is the same. */
function inlineItems(content: JsonValue | undefined, breaksAsSpaces: boolean): Inline[] {
  const items: Inline[] = [];
  const pushText = (text: string, textMarks: Mark[], code: boolean) => {
    for (const [index, line] of text.split(/\r\n?|\n/u).entries()) {
      if (index > 0 && !breaksAsSpaces) items.push({ kind: 'break' });
      const piece = index > 0 && breaksAsSpaces ? ` ${line}` : line;
      const previous = items.at(-1);
      if (previous?.kind === 'text' && previous.code === code && sameMarks(previous.marks, textMarks))
        previous.text += piece;
      else if (piece) items.push({ kind: 'text', text: piece, marks: textMarks, code });
    }
  };
  if (typeof content === 'string') pushText(content, [], false);
  for (const item of Array.isArray(content) ? content : []) {
    if (!record(item)) continue;
    if (item.type === 'text' && typeof item.text === 'string') {
      const styles = record(item.styles) ? item.styles : {};
      const textMarks = marks.filter((mark) => styles[mark] === true);
      pushText(item.text, textMarks, styles.code === true);
    } else if (item.type === 'link' && typeof item.href === 'string') {
      items.push({ kind: 'link', href: item.href, content: inlineItems(item.content, breaksAsSpaces) });
    } else if (item.type === 'math' && typeof item.content === 'string') {
      items.push({ kind: 'math', source: item.content });
    }
  }
  // A hard break at either end of a block would be read as a literal backslash.
  while (items[0]?.kind === 'break') items.shift();
  while (items.at(-1)?.kind === 'break') items.pop();
  return items;
}

/**
 * The marks each piece needs, excluding those already open around it. Bare spaces need none and
 * never close one. Breaks and formulas keep only what their neighbors share, so emphasis closes
 * before a break instead of spanning it.
 */
function markSetsOf(items: readonly Inline[], inherited: readonly Mark[]): (Mark[] | undefined)[] {
  const own = items.map((item): Mark[] | undefined => {
    if (item.kind === 'text') return item.code || item.text.trim() ? item.marks : undefined;
    if (item.kind !== 'link') return [];
    const inner = markSetsOf(item.content, []).filter((set) => set !== undefined);
    return marks.filter((mark) => inner.length > 0 && inner.every((set) => set.includes(mark)));
  });
  const available = own.map((set) => set?.filter((mark) => !inherited.includes(mark)));
  return available.map((set, index) => {
    const item = items[index];
    if (item?.kind !== 'break' && item?.kind !== 'math') return set;
    const before = available.slice(0, index).findLast((value) => value !== undefined) ?? [];
    const after = available.slice(index + 1).find((value) => value !== undefined) ?? [];
    return before.filter((mark) => after.includes(mark));
  });
}

const isWordCharacter = (character: string | undefined) => character !== undefined && /[\p{L}\p{N}_]/u.test(character);

function firstCharacter(item: Inline): string | undefined {
  if (item.kind === 'text') return item.code ? '`' : item.text[0];
  return item.kind === 'link' ? '[' : item.kind === 'math' ? '$' : '\\';
}

/**
 * Emits emphasis as a stack. A mark that lasts longer opens outside a shorter one, so it stays open
 * when the shorter one ends. Spaces at the edges move outside the delimiters, where Markdown accepts
 * them. Italic uses `_`, which cannot merge with the `**` of bold, except inside a word, where only
 * `*` works.
 */
function renderInline(items: readonly Inline[], lineStart: boolean, inherited: readonly Mark[]): string {
  const markSets = markSetsOf(items, inherited);
  const runLength = (from: number, mark: Mark) => {
    let count = 0;
    for (const set of markSets.slice(from)) {
      if (set === undefined) continue;
      if (!set.includes(mark)) break;
      count += 1;
    }
    return count;
  };
  /** The character that will follow the closing delimiter of a run starting at `from`. */
  const characterAfterRun = (from: number, mark: Mark): string | undefined => {
    let spaceBefore = false;
    for (let index = from; index < items.length; index += 1) {
      const set = markSets[index];
      const item = items[index] as Inline;
      if (set === undefined) spaceBefore = true;
      else if (!set.includes(mark)) return spaceBefore ? ' ' : firstCharacter(item);
      else spaceBefore = item.kind === 'text' && !item.code && /\s$/u.test(item.text);
    }
    return undefined;
  };
  const delimiterFor = (mark: Mark, before: string | undefined, after: string | undefined) => {
    if (mark === 'bold') return '**';
    if (mark === 'strike') return '~~';
    return isWordCharacter(before) || isWordCharacter(after) ? '*' : '_';
  };

  let output = '';
  let spaces = '';
  const open: { mark: Mark; delimiter: string }[] = [];
  const atLineStart = () =>
    (lineStart || output.includes('\n')) && /^[ \t]*$/u.test(output.slice(output.lastIndexOf('\n') + 1));

  items.forEach((item, index) => {
    const wanted = markSets[index];
    if (wanted === undefined) {
      if (item.kind === 'text') spaces += item.text;
      return;
    }
    let kept = 0;
    while (kept < open.length && wanted.includes(open[kept]?.mark as Mark)) kept += 1;
    for (const { delimiter } of open.splice(kept).reverse()) output += delimiter;
    const [, lead = '', core = '', trail = ''] =
      item.kind === 'text' && !item.code ? (/^(\s*)(.*?)(\s*)$/su.exec(item.text) ?? []) : [];
    output += spaces + lead;
    spaces = trail;
    const opening = wanted
      .filter((mark) => !open.some((entry) => entry.mark === mark))
      .sort((a, b) => runLength(index, b) - runLength(index, a) || marks.indexOf(a) - marks.indexOf(b));
    for (const mark of opening) {
      const delimiter = delimiterFor(mark, output.at(-1), characterAfterRun(index, mark));
      output += delimiter;
      open.push({ mark, delimiter });
    }
    if (item.kind === 'text')
      output += item.code ? codeSpan(item.text) : escapeText(core, !opening.length && atLineStart());
    else if (item.kind === 'link') output += renderLink(item, [...inherited, ...wanted]);
    else if (item.kind === 'break') output += '\\\n';
    else {
      const formula = inlineMath(item.source);
      output += needsMathSeparator(output, formula) ? `${MATH_SEPARATOR}${formula}` : formula;
    }
  });
  for (const { delimiter } of open.reverse()) output += delimiter;
  return output;
}

function renderLink(link: Extract<Inline, { kind: 'link' }>, inherited: readonly Mark[]): string {
  const label = link.content.length ? renderInline(link.content, false, inherited) : escapeText(link.href, false);
  return `[${label}](${linkDestination(link.href)})`;
}

const percentEncoded: Record<string, string> = { '<': '%3C', '>': '%3E', '(': '%28', ')': '%29' };

/** Angle brackets allow spaces; unbalanced parentheses and angle brackets are percent-encoded. */
function linkDestination(href: string): string {
  const unsafe = parenthesesBalanced(href) ? /[<>]/gu : /[<>()]/gu;
  const encoded = href.replace(unsafe, (character) => percentEncoded[character] ?? character);
  return /\s/u.test(encoded) ? `<${encoded}>` : encoded;
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
  let longestRun = 0;
  for (const run of text.matchAll(/`+/gu)) longestRun = Math.max(longestRun, run[0].length);
  const fence = '`'.repeat(longestRun + 1);
  const padded = /^`|`$/u.test(text) || (/[^ ]/u.test(text) && text.startsWith(' ') && text.endsWith(' '));
  return `${fence}${padded ? ` ${text} ` : text}${fence}`;
}

/**
 * Escapes what would start emphasis, code, links, math or strikethrough anywhere, and block markers
 * at a line start. Only characters that both CommonMark and the BlockNote parser unescape are used;
 * `<` and `&` stay literal because BlockNote has no escape for them.
 */
function escapeText(text: string, lineStart: boolean): string {
  const escaped = text.replace(/[\\`*_[\]$~]/gu, '\\$&');
  if (!lineStart) return escaped;
  return escaped.replace(/^([ \t]*)(?:([#>+|-])|(\d{1,9})([.)]))/u, (_match, space, marker, digits, delimiter) =>
    marker ? `${space}\\${marker}` : `${space}${digits}\\${delimiter}`,
  );
}
