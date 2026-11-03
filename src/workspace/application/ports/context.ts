import type { IsoInstant } from '@tinyfold/core/domain';
import type { Calendar } from '../calendar.js';
import type { BoardRepository } from './board.js';
import type { CanvasPreviewRepository, CanvasRepository } from './canvases.js';
import type { ColumnRepository } from './columns.js';
import type { DocumentRepository } from './documents.js';
import type { FolderRepository } from './folders.js';
import type { LabelRepository } from './labels.js';
import type { MoveRepository } from './moves.js';
import type { PinRepository } from './pins.js';
import type { ProjectRepository } from './projects.js';
import type { TaskRepository } from './tasks.js';
import type { TrashRepository } from './trash.js';

export type WorkspaceRepository = ProjectRepository &
  FolderRepository &
  DocumentRepository &
  CanvasRepository &
  CanvasPreviewRepository &
  TaskRepository &
  ColumnRepository &
  LabelRepository &
  TrashRepository &
  PinRepository &
  MoveRepository &
  BoardRepository;

export interface WorkspaceContext {
  now(): IsoInstant;
  /** The owner's time zone and today in it. */
  calendar(): Promise<Calendar>;
  newId(): string;
  read<T>(work: (repository: WorkspaceRepository) => Promise<T>): Promise<T>;
  write<T>(
    operation: string,
    input: { requestId: string },
    work: (repository: WorkspaceRepository) => Promise<T>,
  ): Promise<T>;
  /**
   * A write transaction that keeps no request record, and so no copy of its input. Only for writes
   * that are safe to repeat as they are, such as storing a drawing preview.
   */
  writeWithoutRequestRecord<T>(work: (repository: WorkspaceRepository) => Promise<T>): Promise<T>;
}
