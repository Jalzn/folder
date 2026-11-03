import type { IsoInstant } from '#core/domain';
import type { DocumentBlock } from '#rich-text/domain';

export interface DocumentSummary {
  id: string;
  projectId: string;
  folderId: string | null;
  title: string;
  plainText: string;
  formatVersion: number;
  version: number;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
  deletedAt: IsoInstant | null;
  pinnedAt: IsoInstant | null;
}

export interface Document extends DocumentSummary {
  content: DocumentBlock[];
}

/** Request records keep identifiers and versions, never the removed document's text. */
export interface DocumentAck {
  id: string;
  version: number;
  updatedAt: IsoInstant;
}

export interface RestoreAck extends DocumentAck {
  folderGone: boolean;
}
