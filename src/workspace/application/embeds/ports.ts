import type { LabelColor } from '../../domain/labels.js';
import type { ProjectColor } from '../../domain/project.js';

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
      dueOn: string | null;
      completedAt: string | null;
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

/** The states of embedded items, one per distinct ID asked, in the order asked, in one read. */
export interface EmbedReader {
  embeds(ids: { taskIds: readonly string[]; canvasIds: readonly string[] }): Promise<EmbeddedItems>;
}

export interface EmbedContext {
  read<T>(work: (reader: EmbedReader) => Promise<T>): Promise<T>;
}
