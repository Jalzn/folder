import type { IsoInstant } from '#core/domain';

export interface CanvasRow {
  id: string;
  /** Required since migration 005, whose triggers refuse null; the column itself stays nullable. */
  project_id: string;
  title: string;
  scene: string;
  plain_text: string;
  search_text: string;
  format_version: number;
  version: number;
  created_at: IsoInstant;
  updated_at: IsoInstant;
  deleted_at: IsoInstant | null;
  pinned_at: IsoInstant | null;
  /** Null at the project's root. A trashed item may keep a deleted folder, where it came from. */
  folder_id: string | null;
}

export interface CanvasPreviewRow {
  canvas_id: string;
  scene_version: number;
  scene_fingerprint: string | null;
  png: Uint8Array;
  width: number;
  height: number;
  created_at: IsoInstant;
}

export interface DrawingsTables {
  workspace_canvases: CanvasRow;
  workspace_canvas_previews: CanvasPreviewRow;
}
