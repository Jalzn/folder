/** Case- and accent-insensitive form shared by the stored search columns and every query. */
export function searchText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
}

/**
 * The distinct normalized words of a query; every one must appear, in any order. Dashes split words
 * and punctuation around a word is dropped, so `"token-pessoal",` finds "token pessoal". Inner
 * punctuation stays, as in "v1.2", and so do symbols such as `$` and `+`.
 */
export function searchTerms(query: string): string[] {
  const words = searchText(query)
    .split(/[\s\p{Pd}]+/u)
    .map(withoutEdgePunctuation);
  return [...new Set(words.filter(Boolean))];
}

const isPunctuation = (character: string | undefined) => character !== undefined && /\p{P}/u.test(character);

function withoutEdgePunctuation(word: string): string {
  const characters = Array.from(word);
  let start = 0;
  let end = characters.length;
  while (start < end && isPunctuation(characters[start])) start += 1;
  while (end > start && isPunctuation(characters[end - 1])) end -= 1;
  return characters.slice(start, end).join('');
}

export function matchesAllTerms(normalizedText: string, terms: readonly string[]): boolean {
  return terms.every((term) => normalizedText.includes(term));
}
