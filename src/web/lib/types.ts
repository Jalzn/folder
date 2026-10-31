export type {
  Canvas,
  CanvasScene,
  CanvasSummary,
  Document,
  DocumentBlock,
  DocumentContent,
  DocumentSummary,
  Project,
  Task,
  TaskStatus,
} from '@tinyfold/workspace/domain';

export { TASK_STATUSES, taskStatusLabels } from '@tinyfold/workspace/domain';

/** What an item without a title is called wherever it shows. */
export const UNTITLED = 'Sem título';

/** An item's title as lists, menus and toasts show it. */
export const displayTitle = (title: string) => title || UNTITLED;

/** The items a project lists in its sidebar and Índice. */
export type ItemType = 'document' | 'drawing';

/** Every kind of item, as lists name it. */
export const itemTypeLabels: Record<ItemType | 'task', string> = {
  document: 'Documento',
  drawing: 'Desenho',
  task: 'Tarefa',
};
