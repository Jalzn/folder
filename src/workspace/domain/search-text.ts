/** Case- and accent-insensitive form shared by the stored search columns and every query. */
export function searchText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
}

/** The distinct normalized words of a query; every one must appear, in any order. */
export function searchTerms(query: string): string[] {
  return [...new Set(searchText(query).split(/\s+/u).filter(Boolean))];
}

export function matchesAllTerms(normalizedText: string, terms: readonly string[]): boolean {
  return terms.every((term) => normalizedText.includes(term));
}
