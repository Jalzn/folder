const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const number = new Intl.NumberFormat('pt-BR');

/**
 * What emptying deletes: "7 itens serão excluídos de vez." With a filter on, only the items shown go, and
 * the others stay: "Os 2 itens mostrados serão excluídos de vez; os outros continuam na lixeira."
 */
export function emptyTrashBody(shown: number, filtered: boolean) {
  const end = 'Não dá para desfazer.';
  if (!filtered) return `${count(shown, 'item será excluído', 'itens serão excluídos')} de vez. ${end}`;
  return shown === 1
    ? `O item mostrado será excluído de vez; os outros continuam na lixeira. ${end}`
    : `Os ${shown} itens mostrados serão excluídos de vez; os outros continuam na lixeira. ${end}`;
}

/** After emptying: "Lixeira vazia.", and how many items were kept because they changed elsewhere. */
export function emptiedText(kept: number, filtered = false) {
  const done = filtered ? 'Itens mostrados excluídos de vez.' : 'Lixeira vazia.';
  if (!kept) return done;
  return `${done} ${count(kept, 'item mudou em outro lugar e foi mantido', 'itens mudaram em outro lugar e foram mantidos')}.`;
}

/** Above a long trash: "Mostrando os 1.000 mais recentes de 1.200." */
export const shownOfTotal = (shown: number, total: number) =>
  `Mostrando os ${number.format(shown)} mais recentes de ${number.format(total)}.`;
