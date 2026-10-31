import { shortDate } from '../../../lib/dates';
import { displayTitle, type ItemType, type TaskStatus, taskStatusLabels } from '../../../lib/types';

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The line under the project's title: "5 tarefas abertas. Último texto editado: Visão do produto, hoje."
 * The late count joins it in stage 10.
 */
export function overviewSummary(
  openTasks: number,
  lastEdited: { type: ItemType; title: string; updatedAt: string } | null,
  now = new Date(),
) {
  const tasks = openTasks ? `${count(openTasks, 'tarefa aberta', 'tarefas abertas')}.` : 'Nenhuma tarefa aberta.';
  if (!lastEdited) return tasks;
  const noun = lastEdited.type === 'document' ? 'texto' : 'desenho';
  return `${tasks} Último ${noun} editado: ${displayTitle(lastEdited.title)}, ${shortDate(lastEdited.updatedAt, now)}.`;
}

/** What Agora leaves out, per column in board order: "Mais 3 em A fazer." */
export function leftOutLine(rest: readonly { status: TaskStatus; count: number }[]) {
  const parts = rest.filter((column) => column.count > 0);
  if (!parts.length) return '';
  return `${parts.map((column) => `Mais ${column.count} em ${taskStatusLabels[column.status]}`).join(' · ')}.`;
}
