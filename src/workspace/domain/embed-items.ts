import type { CivilDate, IsoInstant } from '@tinyfold/core/domain';
import type { LabelColor } from './labels.js';
import type { ProjectColor } from './project.js';

/**
 * The states of embedded items, as the editor reads them through resolveEmbeds and the MCP through
 * read_document (stage 11, "Estados de um incorporado").
 */
/** The project an embedded item lives in: the card and the caption name it when it is another one. */
export interface EmbedProject {
  id: string;
  name: string;
  color: ProjectColor;
  archived: boolean;
}

/**
 * An embedded task as the document reads it (stage 11, "Estados de um incorporado"): live, with the
 * board's summary; in the trash, with what Restaurar needs; or missing, deleted for good or never
 * there, with its ID alone.
 */
export type EmbeddedTask =
  | {
      state: 'live';
      id: string;
      title: string;
      version: number;
      column: { id: string; name: string; isDone: boolean };
      dueOn: CivilDate | null;
      completedAt: IsoInstant | null;
      /** The active labels, in alphabetical order. */
      labels: { id: string; name: string; color: LabelColor }[];
      checklist: { done: number; total: number } | null;
      project: EmbedProject;
    }
  | { state: 'trashed'; id: string; title: string; version: number }
  | { state: 'missing'; id: string };

/** The stored PNG preview of an embedded drawing, and whether it shows the current scene. */
export interface EmbedPreview {
  /** The fingerprint of the scene the image shows; null for a preview from before migration 004. */
  fingerprint: string | null;
  /** The drawing version the image was made at. */
  sceneVersion: number;
  width: number;
  height: number;
  /** Whether it shows the current scene; when not, the document makes a new one. */
  current: boolean;
}

export type EmbeddedDrawing =
  | {
      state: 'live';
      id: string;
      title: string;
      version: number;
      project: EmbedProject;
      /** The active folder it is in, or null at the project's root. */
      folder: { id: string; name: string } | null;
      preview: EmbedPreview | null;
      /** A scene with no live element, which has nothing to show. */
      empty: boolean;
    }
  | { state: 'trashed'; id: string; title: string; version: number }
  | { state: 'missing'; id: string };

export interface EmbeddedItems {
  tasks: EmbeddedTask[];
  drawings: EmbeddedDrawing[];
}
