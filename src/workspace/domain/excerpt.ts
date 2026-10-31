import { searchText } from './search-text.js';

const ellipsis = '…';
const chunkCodePoints = 256;

/** Whether the text an excerpt is taken from is itself cut out of a longer text. */
export interface TextCut {
  before: boolean;
  after: boolean;
}

const uncut: TextCut = { before: false, after: false };

/**
 * Up to `length` code points of `text` on one line, starting `lead` code points before the first
 * occurrence of any term, or at the start without terms. Cut ends get an ellipsis. Positions are
 * found in the normalized text and mapped back, so stripped accents and variation selectors before
 * the match do not move the excerpt away from it. Without terms nothing is normalized.
 */
export function excerptAround(
  text: string,
  terms: readonly string[],
  length: number,
  lead: number,
  cut: TextCut = uncut,
): string {
  const match = terms.length ? firstMatch(text, terms) : undefined;
  const start = match === undefined ? 0 : codePointsBefore(text, match, lead);
  const window = Array.from(text.slice(start, start + 2 * (length + 1))).slice(0, length + 1);
  let excerpt = window.slice(0, length);
  if (start > 0 || cut.before) excerpt = [ellipsis, ...excerpt.slice(1)];
  if (window.length > length || cut.after) excerpt = [...excerpt.slice(0, length - 1), ellipsis];
  return excerpt.join('').replace(/\s+/gu, ' ').trim();
}

/** The index in `text` of the first occurrence of any term, matched in the normalized text. */
function firstMatch(text: string, terms: readonly string[]): number | undefined {
  const normalized = searchText(text);
  const positions = terms.map((term) => normalized.indexOf(term)).filter((index) => index >= 0);
  return positions.length ? originalIndex(text, normalized, Math.min(...positions)) : undefined;
}

/**
 * The index in `text` of the code point that produced `normalizedIndex` in searchText(text).
 * Normalization works code point by code point, so lengths add up and chunks keep this linear.
 */
function originalIndex(text: string, normalized: string, normalizedIndex: number): number {
  if (normalized.length === text.length) return normalizedIndex;
  let produced = 0;
  let index = 0;
  while (index < text.length) {
    const piece = codePointsFrom(text, index, chunkCodePoints);
    const pieceLength = searchText(piece).length;
    if (produced + pieceLength <= normalizedIndex) {
      produced += pieceLength;
      index += piece.length;
      continue;
    }
    for (const codePoint of piece) {
      produced += searchText(codePoint).length;
      if (produced > normalizedIndex) return index;
      index += codePoint.length;
    }
  }
  return index;
}

const isHighSurrogate = (code: number) => code >= 0xd800 && code <= 0xdbff;
const isLowSurrogate = (code: number) => code >= 0xdc00 && code <= 0xdfff;

function codePointsFrom(text: string, index: number, count: number): string {
  let end = index;
  for (let step = 0; step < count && end < text.length; step += 1)
    end += isHighSurrogate(text.charCodeAt(end)) && isLowSurrogate(text.charCodeAt(end + 1)) ? 2 : 1;
  return text.slice(index, end);
}

/** The index `count` code points before `index`, never inside a surrogate pair. */
function codePointsBefore(text: string, index: number, count: number): number {
  let start = index;
  for (let step = 0; step < count && start > 0; step += 1) {
    start -= 1;
    if (isLowSurrogate(text.charCodeAt(start)) && isHighSurrogate(text.charCodeAt(start - 1))) start -= 1;
  }
  return start;
}
