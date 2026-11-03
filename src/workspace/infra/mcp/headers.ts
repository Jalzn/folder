import type { OriginTask, ProjectReference, TaskForReading } from '../../application/reading/read-models.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import { isOverdue } from '../../domain/task-dates.js';
import { collapseWhitespace } from '../../domain/text.js';
import { codePointPrefix } from './text-cut.js';

/** User text placed in a header line: a line break inside it could forge more header lines. */
const singleLine = collapseWhitespace;

/** The project's name on one line, flagged when archived. */
export const projectName = (reference: ProjectReference): string =>
  `${singleLine(reference.projectName)}${reference.projectArchived ? ' (arquivado)' : ''}`;

const shortTitle = (title: string, max = READING_LIMITS.document.originTaskTitleChars) =>
  title.length > max ? `${title.slice(0, max)}…` : title;

/**
 * Metadata that opens the first page of read_document, within `maxChars`: origin tasks that do not
 * fit are counted. Titles stay on their line; task titles are quoted.
 */
export function documentHeader(
  input: {
    document: ProjectReference & {
      id: string;
      title: string;
      version: number;
      updatedAt: string;
      folder: { name: string } | null;
    };
    originTasks: OriginTask[];
    originTaskCount: number;
    empty: boolean;
  },
  maxChars: number = READING_LIMITS.document.headerChars,
): string {
  const { document } = input;
  const lines = [
    `# ${singleLine(document.title)}`,
    '',
    `- Projeto: ${projectName(document)}`,
    `- Pasta: ${document.folder ? singleLine(document.folder.name) : 'nenhuma (raiz do projeto)'}`,
    `- Atualizado: ${document.updatedAt} · versão ${document.version}`,
    `- ID: ${document.id}`,
  ];
  if (input.empty) lines.push('- Conteúdo: vazio');
  if (!input.originTaskCount) return lines.join('\n');
  lines.push('- Tarefas originadas aqui:');
  // Keep room for the line that counts the rest.
  let length = lines.join('\n').length + 200;
  let shown = 0;
  for (const task of input.originTasks) {
    const line = `  - ${JSON.stringify(shortTitle(task.title))} (${singleLine(task.column)}, id ${task.id})`;
    if (length + line.length + 1 > maxChars) break;
    lines.push(line);
    length += line.length + 1;
    shown += 1;
  }
  const rest = input.originTaskCount - shown;
  if (rest > 0)
    lines.push(
      `  - … e mais ${rest} ${rest === 1 ? 'tarefa' : 'tarefas'}. Use list_tasks com documentId ${JSON.stringify(document.id)} para ver todas.`,
    );
  return lines.join('\n');
}

/**
 * `text` in JSON quotes, which keep it on one line, within `maxChars`: a longer one is cut and ends
 * with an ellipsis inside the quotes.
 */
function quotedWithin(text: string, maxChars: number): string {
  const whole = JSON.stringify(text);
  if (whole.length <= maxChars) return whole;
  let low = 0;
  let high = text.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (JSON.stringify(`${codePointPrefix(text, middle)}…`).length <= maxChars) low = middle;
    else high = middle - 1;
  }
  return JSON.stringify(`${codePointPrefix(text, low)}…`);
}

/** As many label names as fit `maxChars`, the rest counted. */
function labelNames(labels: TaskForReading['labels'], maxChars: number): string {
  if (!labels.length) return 'nenhuma';
  const names = labels.map((label) => singleLine(label.name));
  for (let shown = names.length; shown > 0; shown -= 1) {
    const rest = names.length - shown;
    const text = `${names.slice(0, shown).join(', ')}${rest ? ` … e mais ${rest} ${rest === 1 ? 'etiqueta' : 'etiquetas'}` : ''}`;
    if (text.length <= maxChars) return text;
  }
  return `${names.length} ${names.length === 1 ? 'etiqueta' : 'etiquetas'}`;
}

/** Where the source document stands: readable, in the trash, or purged with the title it had. */
function sourceDocumentText(source: NonNullable<TaskForReading['source']>): string {
  const title = JSON.stringify(shortTitle(singleLine(source.documentTitle ?? '')));
  if (source.available && source.documentId) return `documento ${title} (id ${source.documentId})`;
  if (source.documentId) return `documento na lixeira (id ${source.documentId})`;
  return `documento excluído de vez, que se chamava ${title}`;
}

/** Room the excerpt keeps when the label names are long. */
const MIN_CUT_ROOM = 200;

/**
 * Metadata that opens the first page of read_task, within `maxChars`: label names and the source
 * excerpt are cut to fit. Dates are civil dates in the owner's time zone, `today` among them.
 */
export function taskHeader(
  input: { task: Omit<TaskForReading, 'description'>; today: string; empty: boolean },
  maxChars: number = READING_LIMITS.task.headerChars,
): string {
  const { task, today } = input;
  const due = !task.dueOn
    ? 'nenhum'
    : `${isOverdue(task.dueOn, today, task.column.isDone) ? `atrasada desde ${task.dueOn}` : task.dueOn} (hoje é ${today})`;
  const before = [
    `# ${singleLine(task.title)}`,
    '',
    `- Projeto: ${projectName(task)}`,
    `- Coluna: ${singleLine(task.column.name)}${task.column.isDone ? ' (conclusão)' : ''}`,
    `- Prazo: ${due}`,
  ];
  const after: string[] = [];
  if (task.checklist) after.push(`- Checklist: ${task.checklist.done} de ${task.checklist.total}`);
  if (task.completedAt) after.push(`- Concluída em: ${task.completedAt}`);
  const { source } = task;
  const origin = source
    ? `- Origem: ${sourceDocumentText(source)}${source.blockId ? `, bloco ${singleLine(source.blockId)}` : ''}`
    : '- Origem: nenhuma';
  after.push(origin);
  const excerptLabel = `  - Trecho${source && !source.blockAvailable ? ' (não está mais no documento)' : ''}: `;
  const closing = [`- Atualizada: ${task.updatedAt} · versão ${task.version}`, `- ID: ${task.id}`];
  if (input.empty) closing.push('- Descrição: vazia');

  const labelsLabel = '- Etiquetas: ';
  const fixed = [...before, labelsLabel, ...after, ...(source ? [excerptLabel] : []), ...closing].join('\n').length;
  const room = Math.max(0, maxChars - fixed);
  // The labels come first, leaving the excerpt at least MIN_CUT_ROOM when there is that much.
  const labels = labelNames(task.labels, source ? Math.max(Math.min(room, MIN_CUT_ROOM), room - MIN_CUT_ROOM) : room);
  const lines = [...before, `${labelsLabel}${labels}`, ...after];
  if (source) lines.push(`${excerptLabel}${quotedWithin(source.excerpt, room - labels.length)}`);
  return [...lines, ...closing].join('\n');
}

import type { DrawingImage, readDrawing } from '../../application/reading/read-drawing.js';

function imageLine(image: DrawingImage, version: number, withStructure: boolean): string {
  if (image.state === 'empty') return 'Imagem: o desenho está vazio';
  if (image.state === 'missing') return 'Imagem: indisponível. Abra o desenho no Tinyfold para gerá-la';
  const size = `${image.width}×${image.height} px`;
  // A rename or a trip to the trash bumps the version without changing what the image shows.
  if (image.current) return `Imagem: versão ${version} (atual), ${size}`;
  const note = withStructure ? '. A estrutura abaixo está atualizada' : '';
  return `Imagem: versão ${image.sceneVersion}, ${size}; a cena atual é a ${version}${note}`;
}
export function drawingHeader({ drawing, image, outline }: Awaited<ReturnType<typeof readDrawing>>): string {
  // Names are quoted: a "·" inside one could otherwise pass for another field.
  const project = `Projeto ${JSON.stringify(drawing.projectName)}${drawing.projectArchived ? ' (arquivado)' : ''}`;
  const folder = drawing.folder ? `Pasta ${JSON.stringify(drawing.folder.name)}` : 'Sem pasta';
  const header = [
    `Desenho ${JSON.stringify(drawing.title)} · ${project} · ${folder} · versão ${drawing.version} · atualizado em ${drawing.updatedAt} · ID ${drawing.id}`,
  ];
  if (image) header.push(imageLine(image, drawing.version, outline !== null));
  return header.join('\n');
}
