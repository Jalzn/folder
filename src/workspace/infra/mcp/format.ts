import type { OriginTask, ProjectReference } from '../../application/reading/ports.js';
import type { TaskStatus } from '../../domain/models.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import { taskStatusLabels } from '../../domain/task-status.js';
import type { AgentToolResult } from './types.js';

export const textResult = (text: string): AgentToolResult => ({ content: [{ type: 'text', text }] });

/** Lists go out as compact JSON: indentation would only spend tokens. */
export const compactJson = (value: unknown): string => JSON.stringify(value);

export const statusFields = (status: TaskStatus) => ({ status, statusLabel: taskStatusLabels[status] });

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

/** The project's name, flagged when archived; null for an item outside any project. */
export function projectName(reference: ProjectReference): string | null {
  if (!reference.projectName) return null;
  return `${singleLine(reference.projectName)}${reference.projectArchived ? ' (arquivado)' : ''}`;
}

const shortTitle = (title: string, max = READING_LIMITS.document.originTaskTitleChars) =>
  title.length > max ? `${title.slice(0, max)}…` : title;

/**
 * Metadata that opens the first page of read_document, within its own budget: origin tasks that do
 * not fit are counted. Titles stay on their line; task titles are quoted.
 */
export function documentHeader(input: {
  document: ProjectReference & { id: string; title: string; version: number; updatedAt: string };
  originTasks: OriginTask[];
  originTaskCount: number;
  empty: boolean;
}): string {
  const { document } = input;
  const lines = [
    `# ${singleLine(document.title)}`,
    '',
    `- Projeto: ${projectName(document) ?? 'nenhum'}`,
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
    const line = `  - ${JSON.stringify(shortTitle(task.title))} (${taskStatusLabels[task.status]}, id ${task.id})`;
    if (length + line.length + 1 > READING_LIMITS.document.headerChars) break;
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
