import type { OriginTask, ProjectReference, TaskDetail } from '../../application/reading/ports.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import { isOverdue } from '../../domain/task-dates.js';
import type { AgentToolResult } from './types.js';

export const textResult = (text: string): AgentToolResult => ({ content: [{ type: 'text', text }] });

/** Lists go out as compact JSON: indentation would only spend tokens. */
export const compactJson = (value: unknown): string => JSON.stringify(value);

/**
 * Renders as many leading items as fit the output budget. The caller's `render` receives the items
 * that fit and points the next cursor at the first one left out.
 */
export function fitItems<T>(items: readonly T[], render: (shown: readonly T[]) => string): string {
  let count = items.length;
  let text = render(items);
  const budget = READING_LIMITS.toolTextChars;
  while (text.length > budget && count > 1) {
    count = Math.max(1, Math.min(count - 1, Math.floor((count * budget) / text.length)));
    text = render(items.slice(0, count));
  }
  return text;
}

/** User text placed in a header line: a line break inside it could forge more header lines. */
export const singleLine = (text: string) => text.replace(/\s+/gu, ' ').trim();

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

/** The first `count` UTF-16 units of `text`, one fewer where the cut would split a surrogate pair. */
function leading(text: string, count: number): string {
  const code = text.charCodeAt(count - 1);
  return text.slice(0, code >= 0xd800 && code <= 0xdbff ? count - 1 : count);
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
    if (JSON.stringify(`${leading(text, middle)}…`).length <= maxChars) low = middle;
    else high = middle - 1;
  }
  return JSON.stringify(`${leading(text, low)}…`);
}

/** As many label names as fit `maxChars`, the rest counted. */
function labelNames(labels: TaskDetail['labels'], maxChars: number): string {
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
function sourceDocumentText(source: NonNullable<TaskDetail['source']>): string {
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
  input: { task: Omit<TaskDetail, 'description'>; today: string; empty: boolean },
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
