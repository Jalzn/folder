import type { IsoInstant } from '@tinyfold/core/domain';

export interface DocumentRow {
  id: string;
  project_id: string;
  title: string;
  content: string;
  plain_text: string;
  search_text: string;
  format_version: number;
  version: number;
  created_at: IsoInstant;
  updated_at: IsoInstant;
  deleted_at: IsoInstant | null;
  pinned_at: IsoInstant | null;
  folder_id: string | null;
}

export interface DocumentTables {
  workspace_documents: DocumentRow;
}
