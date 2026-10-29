import type { TaskStatus } from '@tinyfold/workspace/domain';

export type { Document, DocumentContent, DocumentSummary, Project, Task, TaskStatus } from '@tinyfold/workspace/domain';

export const statusLabels: Record<TaskStatus, string> = { todo: 'A fazer', doing: 'Em andamento', done: 'Concluído' };
export const taskStatuses: TaskStatus[] = ['todo', 'doing', 'done'];
export function relativeDate(value: string) {
  const date = new Date(value);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days < 1) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 7) return `Há ${days} dias`;
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
}
