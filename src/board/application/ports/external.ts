import type { IsoInstant } from '@tinyfold/core/domain';
import type { DocumentContent } from '@tinyfold/rich-text/domain';
import type { CreateTaskInput } from '../schemas/tasks.js';

/** The project facts board rules need; projects remain owned by their module. */
export interface BoardProject {
  id: string;
  archivedAt: IsoInstant | null;
}

/** A snapshot used only to present the availability of a task's document source. */
export interface SourceDocument {
  id: string;
  title: string;
  deletedAt: IsoInstant | null;
  content: DocumentContent;
  plainText: string;
}

/** A source validated in the outer transaction by the document/workspace participant. */
export interface ResolvedTaskSource {
  documentId: string;
  documentTitle: string;
  projectId: string;
  blockId: string | null;
  excerpt: string;
}

export interface BoardExternalPorts {
  findProject(id: string): Promise<BoardProject | undefined>;
  projectsByIds(ids: readonly string[]): Promise<(BoardProject & { name: string })[]>;
  documentsByIds(ids: readonly string[], options?: { content?: boolean }): Promise<SourceDocument[]>;
  resolveTaskSource(source: NonNullable<CreateTaskInput['source']>): Promise<ResolvedTaskSource>;
}
