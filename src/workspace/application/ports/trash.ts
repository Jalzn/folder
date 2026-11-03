/** Deleting items for good. Drawing previews and task sources follow their item by foreign key. */
export interface TrashRepository {
  /** Keeps the document's current title on the sources of the tasks created from it. */
  keepTitleInSources(documentId: string, title: string): Promise<void>;
  /** Task sources keep the excerpt and the title, without the document. */
  deleteDocumentRow(id: string): Promise<void>;
  /** The preview goes with the drawing. */
  deleteCanvasRow(id: string): Promise<void>;
  /** The source goes with the task. */
  deleteTaskRow(id: string): Promise<void>;
}
