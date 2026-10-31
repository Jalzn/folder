import { ESCAPED_ANYWHERE, type Inline, MARKS, type Mark } from './markdown-items.js';

/** One formatted piece of inline content, with the emphasis written around it. */
export interface EmphasisStep {
  item: Inline;
  /** Delimiters closed before the item, innermost first. */
  close: string[];
  /** Spaces kept outside the delimiters, where Markdown accepts them. */
  spaces: string;
  /** Delimiters opened before the item, outermost first. */
  open: string[];
  /** For a text item, its text without the edge spaces. */
  text: string;
  /** Marks open around the item; a link label does not repeat them. */
  around: Mark[];
}

export interface EmphasisPlan {
  steps: EmphasisStep[];
  /** Delimiters still open after the last item. */
  end: string[];
}

/** A character that counts as punctuation next to a delimiter: another delimiter. */
const DELIMITER = '*';

interface Span {
  mark: Mark;
  opensAt: Draft;
  closesAt: Draft | 'end';
  opening: string;
  closing: string;
}

interface Draft {
  item: Inline;
  closes: Span[];
  opens: Span[];
  spaces: string;
  text: string;
  around: Mark[];
}

/**
 * Decides where emphasis opens and closes around inline pieces, in linear time. A mark that lasts
 * longer opens outside a shorter one, so it stays open when the shorter one ends. Edge spaces move
 * outside the delimiters.
 */
export function planEmphasis(items: readonly Inline[], inherited: readonly Mark[]): EmphasisPlan {
  const sets = markSets(items, inherited);
  const runs = runLengths(sets);
  const drafts: Draft[] = [];
  const spans: Span[] = [];
  const open: Span[] = [];
  let pending = '';
  items.forEach((item, index) => {
    const wanted = sets[index];
    if (wanted === undefined) {
      if (item.kind === 'text') pending += item.text;
      return;
    }
    const [lead, text, trail] = item.kind === 'text' && !item.code ? edges(item.text) : ['', '', ''];
    const draft: Draft = { item, closes: [], opens: [], spaces: pending + lead, text, around: [] };
    let kept = 0;
    while (kept < open.length && wanted.includes((open[kept] as Span).mark)) kept += 1;
    for (const span of open.splice(kept).reverse()) {
      span.closesAt = draft;
      draft.closes.push(span);
    }
    const run = runs[index] as Record<Mark, number>;
    const opening = wanted
      .filter((mark) => !open.some((span) => span.mark === mark))
      .sort((a, b) => run[b] - run[a] || MARKS.indexOf(a) - MARKS.indexOf(b));
    for (const mark of opening) {
      const span: Span = { mark, opensAt: draft, closesAt: 'end', opening: '', closing: '' };
      open.push(span);
      spans.push(span);
      draft.opens.push(span);
    }
    draft.around = [...inherited, ...open.map((span) => span.mark)];
    drafts.push(draft);
    pending = trail;
  });
  const endCloses = open.reverse();

  const position = new Map(drafts.map((draft, index) => [draft, index]));
  const previous = (draft: Draft | 'end') => drafts[(draft === 'end' ? drafts.length : (position.get(draft) ?? 0)) - 1];
  const closesOf = (draft: Draft | 'end') => (draft === 'end' ? endCloses : draft.closes);
  for (const span of spans) {
    const at = span.opensAt;
    const order = at.opens.indexOf(span);
    const before = order > 0 || at.closes.length ? DELIMITER : at.spaces ? ' ' : lastCharacter(previous(at));
    const after = order < at.opens.length - 1 ? DELIMITER : firstCharacter(at);
    const closing = closesOf(span.closesAt);
    const closeOrder = closing.indexOf(span);
    const end = span.closesAt;
    const beforeClose = closeOrder > 0 ? DELIMITER : lastCharacter(previous(end));
    const afterClose =
      closeOrder < closing.length - 1
        ? DELIMITER
        : end === 'end'
          ? undefined
          : end.spaces
            ? ' '
            : end.opens.length
              ? DELIMITER
              : firstCharacter(end);
    [span.opening, span.closing] = delimiters(span.mark, { before, after }, { before: beforeClose, after: afterClose });
  }

  return {
    steps: drafts.map((draft) => ({
      item: draft.item,
      close: draft.closes.map((span) => span.closing),
      spaces: draft.spaces,
      open: draft.opens.map((span) => span.opening),
      text: draft.text,
      around: draft.around,
    })),
    end: endCloses.map((span) => span.closing),
  };
}

interface Context {
  before: string | undefined;
  after: string | undefined;
}

const isWordCharacter = (character: string | undefined) => character !== undefined && /[\p{L}\p{N}_]/u.test(character);

/** `_` cannot open or close inside a word, so italic switches to `*` there. */
function delimiters(mark: Mark, opening: Context, closing: Context): [string, string] {
  if (mark === 'bold') return ['**', '**'];
  if (mark === 'strike') return ['~~', '~~'];
  const inWord = isWordCharacter(opening.before) || isWordCharacter(closing.after);
  return inWord ? ['*', '*'] : ['_', '_'];
}

/**
 * The marks each piece needs, minus those already open around it. Bare spaces need none and never
 * close one. Breaks and formulas keep only what their neighbors share, so emphasis closes before a
 * break instead of spanning it.
 */
function markSets(items: readonly Inline[], inherited: readonly Mark[]): (Mark[] | undefined)[] {
  const own = items.map((item): Mark[] | undefined => {
    if (item.kind === 'text') return item.code || item.text.trim() ? item.marks : undefined;
    if (item.kind !== 'link') return [];
    const inner = markSets(item.content, []).filter((set) => set !== undefined);
    return MARKS.filter((mark) => inner.length > 0 && inner.every((set) => set.includes(mark)));
  });
  const sets = own.map((set) => set?.filter((mark) => !inherited.includes(mark)));
  const before: (Mark[] | undefined)[] = [];
  let last: Mark[] | undefined;
  for (const [index, set] of sets.entries()) {
    before[index] = last;
    if (set !== undefined) last = set;
  }
  const after: (Mark[] | undefined)[] = [];
  last = undefined;
  for (let index = sets.length - 1; index >= 0; index -= 1) {
    after[index] = last;
    if (sets[index] !== undefined) last = sets[index];
  }
  return sets.map((set, index) => {
    const kind = items[index]?.kind;
    if (kind !== 'break' && kind !== 'math') return set;
    const next = after[index] ?? [];
    return (before[index] ?? []).filter((mark) => next.includes(mark));
  });
}

/** For each piece and mark, how many formatted pieces in a row from it carry the mark. */
function runLengths(sets: readonly (Mark[] | undefined)[]): Record<Mark, number>[] {
  const runs: Record<Mark, number>[] = [];
  let next: Record<Mark, number> = { bold: 0, italic: 0, strike: 0 };
  for (let index = sets.length - 1; index >= 0; index -= 1) {
    const set = sets[index];
    if (set !== undefined)
      next = {
        bold: set.includes('bold') ? next.bold + 1 : 0,
        italic: set.includes('italic') ? next.italic + 1 : 0,
        strike: set.includes('strike') ? next.strike + 1 : 0,
      };
    runs[index] = next;
  }
  return runs;
}

const isSpace = (character: string | undefined) => character !== undefined && /\s/u.test(character);

/** Leading spaces, the text between, trailing spaces; scanned by hand, as a regex can go quadratic here. */
function edges(text: string): [string, string, string] {
  let start = 0;
  while (isSpace(text[start])) start += 1;
  let end = text.length;
  while (end > start && isSpace(text[end - 1])) end -= 1;
  return [text.slice(0, start), text.slice(start, end), text.slice(end)];
}

function firstCharacter(draft: Draft): string | undefined {
  const { item } = draft;
  if (item.kind === 'text') {
    if (item.code) return '`';
    const first = String.fromCodePoint(draft.text.codePointAt(0) ?? 32);
    return ESCAPED_ANYWHERE.test(first) ? '\\' : first;
  }
  return item.kind === 'link' ? '[' : item.kind === 'math' ? '$' : '\\';
}

function lastCharacter(draft: Draft | undefined): string | undefined {
  if (!draft) return undefined;
  const { item } = draft;
  if (item.kind === 'text') return item.code ? '`' : Array.from(draft.text.slice(-2)).at(-1);
  return item.kind === 'link' ? ')' : item.kind === 'math' ? '$' : '\n';
}
