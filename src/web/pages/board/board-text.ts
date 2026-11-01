import { countOf } from '../../lib/count';

/**
 * The board's words (docs/etapas/10-quadro-tarefa.md, "Quadro"): its count, the columns' names for a screen
 * reader, what a move says and the toasts of the columns and of completing.
 */

/** "6 tarefas" and, apart, "1 atrasada", which shows in --late. */
export function boardCount(total: number, late: number) {
  return { total: countOf(total, 'tarefa', 'tarefas'), late: late ? countOf(late, 'atrasada', 'atrasadas') : null };
}

/**
 * "Coluna Em andamento, 2 tarefas. Enter renomeia; Shift e setas movem a coluna", without the keys in an
 * archived project.
 */
export function columnLabel(name: string, count: number, isDone: boolean, editable = true) {
  const what = `Coluna ${name}${isDone ? ', coluna de conclusão' : ''}, ${countOf(count, 'tarefa', 'tarefas')}`;
  return editable ? `${what}. Enter renomeia; Shift e setas movem a coluna` : what;
}

/** After a card moves to another column: "Movida para Em andamento, 2 de 3". */
export const movedText = (column: string, index: number, total: number) =>
  `Movida para ${column}, ${index + 1} de ${total}`;

/** After a card moves within its column: "Posição 1 de 3 em A fazer". */
export const positionText = (index: number, total: number, column: string) =>
  `Posição ${index + 1} de ${total} em ${column}`;

/** After a column moves: "Coluna Revisão na posição 3 de 4". */
export const columnPositionText = (name: string, index: number, total: number) =>
  `Coluna ${name} na posição ${index + 1} de ${total}`;

export const BOARD_CHANGED = 'O quadro mudou; tente de novo.';
export const COLUMN_CHANGED = 'A coluna mudou depois; nada foi desfeito.';

/** "Coluna excluída." or "Coluna excluída. 3 tarefas foram para A fazer." */
export function columnDeletedText(moved: number, destination: string | null) {
  if (!moved || !destination) return 'Coluna excluída.';
  return `Coluna excluída. ${moved === 1 ? '1 tarefa foi' : `${countOf(moved, 'tarefa', 'tarefas')} foram`} para ${destination}.`;
}

/** "Revisão agora é a coluna de conclusão." */
export const doneColumnText = (name: string) => `${name} agora é a coluna de conclusão.`;

/** "Coluna Revisão restaurada." and, when some tasks had changed, how many stayed where they were. */
export function columnRestoredText(name: string, skipped: number) {
  if (!skipped) return `Coluna ${name} restaurada.`;
  const rest =
    skipped === 1
      ? '1 tarefa mudou depois e ficou onde estava'
      : `${skipped} tarefas mudaram depois e ficaram onde estavam`;
  return `Coluna ${name} restaurada. ${rest}.`;
}

/** The name a new column takes: "Nova coluna", or the first "Nova coluna 2", "Nova coluna 3"… that is free. */
export function newColumnName(taken: readonly string[], key: (name: string) => string) {
  const used = new Set(taken.map(key));
  for (let n = 1; ; n += 1) {
    const name = n === 1 ? 'Nova coluna' : `Nova coluna ${n}`;
    if (!used.has(key(name))) return name;
  }
}

/** The done column's footer: "Mais 23 concluídas antes de 19 out →". */
export const olderDoneText = (count: number, since: string) =>
  `Mais ${countOf(count, 'concluída', 'concluídas')} antes de ${since} →`;

/** A column left empty by the filter: "Nenhuma tarefa com mcp, backend.". */
export const filteredEmptyText = (names: readonly string[]) => `Nenhuma tarefa com ${names.join(', ')}.`;

/** What the filter shows, said when it changes: "Filtro mcp: 3 tarefas" or "Sem filtro: 6 tarefas". */
export const filterText = (names: readonly string[], total: number) =>
  `${names.length ? `Filtro ${names.join(', ')}` : 'Sem filtro'}: ${countOf(total, 'tarefa', 'tarefas')}`;
