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

/** How a neighboring delimiter counts for flanking: as punctuation. */
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
 * outside the delimiters, and spaces after the last piece are left out: a block's end drops them,
 * and a link label's go after the link.
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
    const [lead, text, trail] = edgesOf(item);
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
  // Bold first: an italic span needs to know whether a neighbor is written `**`.
  for (const span of [...spans.filter(isBold), ...spans.filter((span) => !isBold(span))]) {
    const closing = span.closesAt === 'end' ? endCloses : span.closesAt.closes;
    const sides = [
      beforeOpening(span, previous(span.opensAt)),
      afterOpening(span),
      beforeClosing(span, closing, previous(span.closesAt)),
      afterClosing(span, closing),
    ] as const;
    [span.opening, span.closing] = delimiters(
      span.mark,
      { before: characterOf(sides[0]), after: characterOf(sides[1]) },
      { before: characterOf(sides[2]), after: characterOf(sides[3]) },
      { besideBoldAsterisks: sides.some(isBoldAsterisks) },
    );
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

/** What touches a delimiter on one side: another span's delimiter, or a character, none at the end. */
type Side = Span | string | undefined;

const isBold = (span: Span) => span.mark === 'bold';
const isBoldAsterisks = (side: Side) => typeof side === 'object' && side.opening === '**';
const characterOf = (side: Side) => (typeof side === 'object' ? DELIMITER : side);

// A step writes the delimiters it closes, innermost first, then its spaces, then those it opens.
function beforeOpening(span: Span, previous: Draft | undefined): Side {
  const { closes, spaces, opens } = span.opensAt;
  const order = opens.indexOf(span);
  if (order > 0) return opens[order - 1];
  if (spaces) return ' ';
  return closes.at(-1) ?? lastCharacter(previous);
}

function afterOpening(span: Span): Side {
  const { opens } = span.opensAt;
  return opens[opens.indexOf(span) + 1] ?? firstCharacter(span.opensAt);
}

function beforeClosing(span: Span, closing: readonly Span[], previous: Draft | undefined): Side {
  const order = closing.indexOf(span);
  return order > 0 ? closing[order - 1] : lastCharacter(previous);
}

function afterClosing(span: Span, closing: readonly Span[]): Side {
  const next = closing[closing.indexOf(span) + 1];
  if (next) return next;
  const end = span.closesAt;
  if (end === 'end') return undefined;
  if (end.spaces) return ' ';
  return end.opens[0] ?? firstCharacter(end);
}

interface Context {
  before: string | undefined;
  after: string | undefined;
}

// CommonMark flanking rules: a delimiter run opens or closes emphasis only next to the right characters.
const isWhitespace = (character: string | undefined) => character === undefined || /\s/u.test(character);
const isPunctuation = (character: string | undefined) => character !== undefined && /[\p{P}\p{S}]/u.test(character);
const leftFlanking = ({ before, after }: Context) =>
  !isWhitespace(after) && (!isPunctuation(after) || isWhitespace(before) || isPunctuation(before));
const rightFlanking = ({ before, after }: Context) =>
  !isWhitespace(before) && (!isPunctuation(before) || isWhitespace(after) || isPunctuation(after));
const asterisksWork = (opening: Context, closing: Context) => leftFlanking(opening) && rightFlanking(closing);
/** `_` also refuses to open or close inside a word. */
const underscoresWork = (opening: Context, closing: Context) =>
  leftFlanking(opening) &&
  (!rightFlanking(opening) || isPunctuation(opening.before)) &&
  rightFlanking(closing) &&
  (!leftFlanking(closing) || isPunctuation(closing.after));
const tags: Record<Mark, [string, string]> = {
  bold: ['<strong>', '</strong>'],
  italic: ['<em>', '</em>'],
  strike: ['<del>', '</del>'],
};

/**
 * The delimiters a Markdown reader will take as this emphasis. Italic prefers `_`, which cannot
 * merge with the `**` of bold; a `*` beside `**` would form one delimiter run, which reads
 * differently. Where no delimiter works, as in `**Atenção!**Leia`, the span is written as an HTML
 * tag pair, which both CommonMark and BlockNote read.
 */
function delimiters(
  mark: Mark,
  opening: Context,
  closing: Context,
  { besideBoldAsterisks }: { besideBoldAsterisks: boolean },
): [string, string] {
  // After text ending in `_`, written `\_`, BlockNote reads `\__x_` as plain text.
  const underscoreFits = opening.before !== '_' && underscoresWork(opening, closing);
  if (mark === 'italic' && underscoreFits) return ['_', '_'];
  if (!asterisksWork(opening, closing) || (mark === 'italic' && besideBoldAsterisks)) return tags[mark];
  return mark === 'bold' ? ['**', '**'] : mark === 'strike' ? ['~~', '~~'] : ['*', '*'];
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

/** Edge spaces move outside the delimiters: those of a text, and those a link label ends with. */
function edgesOf(item: Inline): [string, string, string] {
  if (item.kind === 'text' && !item.code) return edges(item.text);
  return ['', '', item.kind === 'link' ? trailingSpaces(item.content) : ''];
}

/** The spaces after the last formatted piece, which a plan of `items` leaves out. */
function trailingSpaces(items: readonly Inline[]): string {
  let spaces = '';
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (item?.kind !== 'text' || item.code) break;
    const [lead, text, trail] = edges(item.text);
    spaces = (text ? trail : lead) + spaces;
    if (text) break;
  }
  return spaces;
}

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
  return item.kind === 'link' ? '[' : item.kind === 'math' ? '$' : item.text[0];
}

function lastCharacter(draft: Draft | undefined): string | undefined {
  if (!draft) return undefined;
  const { item } = draft;
  if (item.kind === 'text') return item.code ? '`' : Array.from(draft.text.slice(-2)).at(-1);
  return item.kind === 'link' ? ')' : item.kind === 'math' ? '$' : item.text.at(-1);
}
