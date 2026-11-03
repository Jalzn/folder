import type { Column } from '../../domain/columns.js';
import type { Label } from '../../domain/labels.js';
import type { Calendar } from '../calendar.js';
import type { Page, TaskForReading, TaskListing, TaskQuery } from './read-models.js';

export interface BoardReader {
  boardRevision(): Promise<number>;
  columns(): Promise<Column[]>;
  labels(): Promise<Label[]>;
  tasks(query: TaskQuery): Promise<Page<TaskListing>>;
  task(id: string): Promise<TaskForReading | undefined>;
}

export interface BoardReadingContext {
  read<T>(work: (reader: BoardReader) => Promise<T>): Promise<T>;
  calendar(): Promise<Calendar>;
}
