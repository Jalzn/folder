export type {
  Canvas,
  CanvasScene,
  CanvasSummary,
  Document,
  DocumentContent,
  DocumentSummary,
  Project,
  Task,
  TaskStatus,
} from '@tinyfold/workspace/domain';

export { TASK_STATUSES, taskStatusLabels } from '@tinyfold/workspace/domain';

/** The items a project lists in its sidebar and Índice. */
export type ItemType = 'document' | 'drawing';
export function relativeDate(value: string) {
  const date = new Date(value);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days < 1) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 7) return `Há ${days} dias`;
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
}
