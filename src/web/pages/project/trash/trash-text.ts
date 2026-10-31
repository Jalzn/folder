const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "7 itens serão excluídos de vez. Não dá para desfazer." */
export const emptyTrashBody = (items: number) =>
  `${count(items, 'item será excluído', 'itens serão excluídos')} de vez. Não dá para desfazer.`;

/** After emptying: "Lixeira vazia.", and how many items were kept because they changed elsewhere. */
export function emptiedText(skipped: number) {
  if (!skipped) return 'Lixeira vazia.';
  return `Lixeira vazia. ${count(skipped, 'item mudou em outro lugar e foi mantido', 'itens mudaram em outro lugar e foram mantidos')}.`;
}
