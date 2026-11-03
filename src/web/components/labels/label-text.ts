import { LABEL_LIMITS, type LabelColor, TASK_LIMITS } from '@tinyfold/workspace/domain';
import { countOf } from '../../lib/text/count';
import { labelColorNames } from './label-colors';

/**
 * The words of "Gerenciar etiquetas" (docs/etapas/10-quadro-tarefa.md, "Etiquetas" and "Desfazer"): the
 * rows' counts, the name errors, the toasts of a deletion and its undo, and what a screen reader hears.
 */

/** "4 tarefas", "1 tarefa" or "Nenhuma tarefa". */
export const labelTaskCount = (tasks: number) => (tasks ? countOf(tasks, 'tarefa', 'tarefas') : 'Nenhuma tarefa');

/** What a row's name says besides the name: "Azul, 4 tarefas. Enter renomeia". */
export const labelRowDescription = (color: LabelColor, tasks: number) =>
  `${labelColorNames[color]}, ${labelTaskCount(tasks).toLowerCase()}. Enter renomeia`;

/** "Já existe uma etiqueta mcp.", as the server says it. */
export const labelTakenText = (name: string) => `Já existe uma etiqueta ${name}.`;

/** "Use até 30 caracteres no nome da etiqueta.", as the server says it. */
export const LABEL_TOO_LONG = `Use até ${LABEL_LIMITS.nameChars} caracteres no nome da etiqueta.`;

/** "Máximo de 100 etiquetas.", as the server says it. */
export const LABELS_FULL = `Máximo de ${LABEL_LIMITS.active} etiquetas.`;

/** What an undo says when the label changed since its deletion (VERSION_CONFLICT). */
export const LABEL_CHANGED = 'A etiqueta mudou depois; nada foi desfeito.';

/** "Etiqueta mcp excluída. Estava em 4 tarefas.", or "Não estava em nenhuma tarefa." */
export function labelDeletedText(name: string, tasks: number) {
  const where = tasks ? `Estava em ${countOf(tasks, 'tarefa', 'tarefas')}.` : 'Não estava em nenhuma tarefa.';
  return `Etiqueta ${name} excluída. ${where}`;
}

/**
 * "Etiqueta mcp restaurada." and, when some tasks reached the most labels a task has since, how many stayed
 * without it: "1 tarefa já tinha 20 etiquetas e ficou sem ela."
 */
export function labelRestoredText(name: string, skipped: number) {
  if (!skipped) return `Etiqueta ${name} restaurada.`;
  const most = TASK_LIMITS.labels;
  const rest =
    skipped === 1
      ? `1 tarefa já tinha ${most} etiquetas e ficou sem ela`
      : `${countOf(skipped, 'tarefa', 'tarefas')} já tinham ${most} etiquetas e ficaram sem ela`;
  return `Etiqueta ${name} restaurada. ${rest}.`;
}

/** Announced after a new label: "Etiqueta urgente criada". */
export const labelCreatedText = (name: string) => `Etiqueta ${name} criada`;

/** Announced after a rename: "Etiqueta renomeada para urgente". */
export const labelRenamedText = (name: string) => `Etiqueta renomeada para ${name}`;

/** Announced after a new color: "Cor da etiqueta mcp: Coral". */
export const labelColorText = (name: string, color: LabelColor) => `Cor da etiqueta ${name}: ${labelColorNames[color]}`;
