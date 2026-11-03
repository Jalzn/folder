export type { Task } from '@tinyfold/board/domain';
export type { Document, DocumentSummary } from '@tinyfold/documents/domain';
export type { Canvas, CanvasScene, CanvasSummary } from '@tinyfold/drawings/domain';
export type { Project } from '@tinyfold/projects/domain';
export type { DocumentBlock, DocumentContent } from '@tinyfold/rich-text/domain';

/** What an item without a title is called wherever it shows. */
export const UNTITLED = 'Sem título';

/** An item's title as lists, menus and toasts show it. */
export const displayTitle = (title: string) => title || UNTITLED;

/** The key of an item, a task, a column or a label among others of every kind: "document:<id>". */
export const itemKey = (type: ItemType | 'task' | 'column' | 'label', id: string) => `${type}:${id}`;

/** The items a project lists in its sidebar and Índice. */
export type ItemType = 'document' | 'drawing';

/** Every kind of item, as lists name it. */
export const itemTypeLabels: Record<ItemType | 'task', string> = {
  document: 'Documento',
  drawing: 'Desenho',
  task: 'Tarefa',
};

/** Untitled items start with an empty editable field. */
export const editableTitle = (title: string) => (title === UNTITLED ? '' : title);
