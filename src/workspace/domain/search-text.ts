/** Case- and accent-insensitive form shared by the stored search columns and every query. */
export function searchText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
}
