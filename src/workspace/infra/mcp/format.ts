import type { OriginTask, ProjectReference } from '../../application/reading/ports.js';
import type { TaskStatus } from '../../domain/models.js';
import { offsetCursor } from '../../domain/paging.js';
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

/** The project's name, flagged when archived; null for an item outside any project. */
/** The cursor after the items shown, which may be fewer than the page when the output budget cut it. */
export function nextPageCursor(page: { offset: number; nextOffset: number | null }, shown: number, total: number) {
  if (shown < total) return offsetCursor(page.offset + shown);
  return page.nextOffset === null ? null : offsetCursor(page.nextOffset);
}

export function projectName(reference: ProjectReference): string | null {
  return reference.projectName && `${reference.projectName}${reference.projectArchived ? ' (arquivado)' : ''}`;
}

const shortTitle = (title: string, max = READING_LIMITS.document.originTaskTitleChars) =>
  title.length > max ? `${title.slice(0, max)}…` : title;

/** Metadata that opens the first page of read_document. Titles are quoted, not parsed as Markdown. */
export function documentHeader(input: {
  document: ProjectReference & { id: string; title: string; version: number; updatedAt: string };
  originTasks: OriginTask[];
  moreOriginTasks: boolean;
  empty: boolean;
}): string {
  const { document } = input;
  const lines = [
    `# ${document.title}`,
    '',
    `- Projeto: ${projectName(document) ?? 'nenhum'}`,
    `- Atualizado: ${document.updatedAt} · versão ${document.version}`,
    `- ID: ${document.id}`,
  ];
  if (input.originTasks.length) {
    lines.push('- Tarefas originadas aqui:');
    for (const task of input.originTasks)
      lines.push(`  - ${JSON.stringify(shortTitle(task.title))} (${taskStatusLabels[task.status]}, id ${task.id})`);
    if (input.moreOriginTasks) lines.push('  - … e outras. Use list_tasks para ver todas.');
  }
  if (input.empty) lines.push('- Conteúdo: vazio');
  return lines.join('\n');
}
