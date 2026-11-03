import { isOverdue } from '#board/domain';
import type { CivilDate } from '#core/domain';
import type { EmbeddedDrawing, EmbeddedTask, EmbedProject, LiveDrawing, LiveTask } from '../../lib/queries/embeds';

/** What an unavailable embed shows: its text and which of Restaurar and Remover it offers. */
export interface UnavailableView {
  kind: 'unavailable';
  text: string;
  /** What Restaurar and Remover name (review B5): "“título”" in the trash, "a tarefa excluída" when gone. */
  subject: string;
  restore: { id: string; title: string; version: number } | null;
  remove: boolean;
}

export type TaskEmbedView =
  | { kind: 'loading' }
  | UnavailableView
  | {
      kind: 'card';
      task: LiveTask;
      done: boolean;
      late: boolean;
      /** The drawer shows the task: "aberta abaixo". */
      open: boolean;
      /** Another project than the document's, which the card names. */
      otherProject: EmbedProject | null;
      /** What the right of the second line says: the column, or "Concluída". */
      status: string;
      label: string;
    };

export type DrawingEmbedView =
  | { kind: 'loading' }
  | UnavailableView
  | {
      kind: 'figure';
      drawing: LiveDrawing;
      number: number;
      otherProject: EmbedProject | null;
      caption: string;
      label: string;
    };

/** What the document tells each embed: its project, today, the open task, and whether it only reads. */
export interface EmbedViewContext {
  documentProjectId: string;
  today: CivilDate;
  openTaskId: string | null;
  /** A document of an archived project only reads: no Restaurar nor Remover. */
  readOnly: boolean;
}

const otherOf = (project: EmbedProject, documentProjectId: string) =>
  project.id === documentProjectId ? null : project;

/** Restaurar and Remover of an unavailable embed: none in a document that only reads. */
function unavailable(
  text: string,
  subject: string,
  restore: UnavailableView['restore'],
  readOnly: boolean,
): UnavailableView {
  return { kind: 'unavailable', text, subject, restore: readOnly ? null : restore, remove: !readOnly };
}

/** The other project, as the card's and the figure's names end: ", em Projeto", with "(arquivado)". */
const inProject = (project: EmbedProject | null) =>
  project ? `, em ${project.name}${project.archived ? ' (arquivado)' : ''}` : '';

/**
 * An embedded task's block (the prototype's `embedInner`): the card of a live task, with "aberta abaixo"
 * while the drawer shows it and the project when it is another one; or the box of one in the trash or gone.
 */
export function taskEmbedView(state: EmbeddedTask | undefined, context: EmbedViewContext): TaskEmbedView {
  if (!state) return { kind: 'loading' };
  if (state.state === 'trashed')
    return unavailable(
      `Na lixeira: ${state.title}`,
      `“${state.title}”`,
      { id: state.id, title: state.title, version: state.version },
      context.readOnly,
    );
  if (state.state === 'missing')
    return unavailable('Esta tarefa foi excluída.', 'a tarefa excluída', null, context.readOnly);
  const done = state.column.isDone;
  const open = context.openTaskId === state.id;
  const otherProject = otherOf(state.project, context.documentProjectId);
  const status = done ? 'Concluída' : state.column.name;
  const where = inProject(otherProject);
  return {
    kind: 'card',
    task: state,
    done,
    late: isOverdue(state.dueOn, context.today, done),
    open,
    otherProject,
    status,
    label: `Tarefa: ${state.title}, ${status}${open ? ', aberta abaixo' : ''}${where}`,
  };
}

/** An embedded drawing's block: "Figura n — título", with the project when it is another one. */
export function drawingEmbedView(
  state: EmbeddedDrawing | undefined,
  number: number,
  context: EmbedViewContext,
): DrawingEmbedView {
  if (!state) return { kind: 'loading' };
  if (state.state === 'trashed')
    return unavailable(
      `Na lixeira: ${state.title}`,
      `“${state.title}”`,
      { id: state.id, title: state.title, version: state.version },
      context.readOnly,
    );
  if (state.state === 'missing')
    return unavailable('Este desenho foi excluído.', 'o desenho excluído', null, context.readOnly);
  const otherProject = otherOf(state.project, context.documentProjectId);
  return {
    kind: 'figure',
    drawing: state,
    number,
    otherProject,
    caption: `Figura ${number} — ${state.title}${otherProject ? ` · ${otherProject.name}` : ''}`,
    // The other project as the visible caption has it (review B6).
    label: `Figura ${number}: ${state.title}${inProject(otherProject)}. Versão atual, somente leitura. Abrir no editor`,
  };
}
