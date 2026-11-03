import { searchText } from '#core/domain';

export interface TextPart {
  text: string;
  match: boolean;
}

/** One character folded as the search folds it: lower case, without accents. */
function fold(character: string) {
  return character.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
}

/** The words of a query, folded, without the punctuation around them. */
export function queryWords(query: string) {
  return fold(query)
    .split(/[\s\-–—]+/u)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean);
}

/**
 * Whether a text holds every word of a query, ignoring case and accents as the search does: the filters of
 * the sidebar, "Mover para pasta…" and ⌘K. An empty query matches everything.
 */
export function matchesAllWords(text: string, query: string) {
  const folded = searchText(text);
  return queryWords(query).every((word) => folded.includes(word));
}

/**
 * Splits a title or excerpt into parts, marking every occurrence of the query's words, ignoring case and
 * accents as the search does, so a result can show its terms in bold.
 */
export function highlightParts(text: string, query: string): TextPart[] {
  const words = queryWords(query);
  if (!words.length || !text) return text ? [{ text, match: false }] : [];
  // The folded text, and where each of its characters came from in the original.
  let folded = '';
  const origin: number[] = [];
  for (let index = 0; index < text.length; ) {
    const point = text.codePointAt(index) ?? 0;
    const character = String.fromCodePoint(point);
    for (const unit of searchText(character)) {
      folded += unit;
      origin.push(index);
    }
    index += character.length;
  }
  origin.push(text.length);
  const marked = new Array<boolean>(text.length).fill(false);
  for (const word of words)
    for (let at = folded.indexOf(word); at >= 0; at = folded.indexOf(word, at + word.length)) {
      const start = origin[at] ?? 0;
      const end = origin[at + word.length] ?? text.length;
      for (let index = start; index < end; index++) marked[index] = true;
    }
  const parts: TextPart[] = [];
  for (let index = 0; index < text.length; index++) {
    const match = marked[index] ?? false;
    const last = parts.at(-1);
    if (last && last.match === match) last.text += text[index];
    else parts.push({ text: text[index] ?? '', match });
  }
  return parts;
}
