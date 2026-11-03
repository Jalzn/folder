import type { CivilDate, IsoInstant } from '@tinyfold/core/domain';
import { shortInstant } from '../../../lib/dates/dates';
import { shortCivilDate as dayAndMonth } from '../../../lib/dates/task-dates';
import { countOf, formatCount } from '../../../lib/text/count';
import { displayTitle, type ItemType } from '../../../lib/types';

/**
 * The line under the project's title: "5 tarefas abertas, 1 atrasada. Último texto editado: Visão do produto,
 * hoje."
 */
export function overviewSummary(
  openTasks: number,
  overdueTasks: number,
  lastEdited: { type: ItemType; title: string; updatedAt: IsoInstant } | null,
  now = new Date(),
) {
  const late = overdueTasks ? `, ${countOf(overdueTasks, 'atrasada', 'atrasadas')}` : '';
  const tasks = openTasks
    ? `${countOf(openTasks, 'tarefa aberta', 'tarefas abertas')}${late}.`
    : 'Nenhuma tarefa aberta.';
  if (!lastEdited) return tasks;
  const noun = lastEdited.type === 'document' ? 'texto' : 'desenho';
  return `${tasks} Último ${noun} editado: ${displayTitle(lastEdited.title)}, ${shortInstant(lastEdited.updatedAt, now)}.`;
}

/** A column Agora left tasks out of, and the one task left when it has a due date. */
export interface LeftOut {
  name: string;
  count: number;
  only: { title: string; dueOn: CivilDate | null } | null;
}

/**
 * What Agora leaves out, per open column in board order: "Mais 3 em A fazer." or, for one task with a due date,
 * "Mais 1 em A fazer: Renovar domínio, 15 nov.".
 */
export function leftOutLine(rest: readonly LeftOut[]) {
  const parts = rest
    .filter((column) => column.count > 0)
    .map((column) =>
      column.count === 1 && column.only?.dueOn
        ? `Mais 1 em ${column.name}: ${displayTitle(column.only.title)}, ${dayAndMonth(column.only.dueOn)}`
        : `Mais ${formatCount(column.count)} em ${column.name}`,
    );
  return parts.length ? `${parts.join(' · ')}.` : '';
}
