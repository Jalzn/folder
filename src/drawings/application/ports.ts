import type { ModuleContext } from '@tinyfold/core/application';
import type { IsoInstant } from '@tinyfold/core/domain';
import type { Canvas, CanvasSummary } from '../domain/index.js';

/** Facts supplied by the server from the organization module in this same transaction. */
export interface DrawingOrganization {
  findProject(id: string): Promise<{ id: string; name: string; archivedAt: IsoInstant | null } | undefined>;
  findFolder(
    id: string,
  ): Promise<{ id: string; name: string; projectId: string; deletedAt: IsoInstant | null } | undefined>;
}

export interface StoredPreview {
  sceneVersion: number;
  sceneFingerprint: string | null;
  width: number;
  height: number;
  png: Uint8Array;
}

export interface CanvasPreviewRecord {
  canvasId: string;
  sceneVersion: number;
  sceneFingerprint: string;
  png: Uint8Array;
  width: number;
  height: number;
  createdAt: IsoInstant;
}

export interface DrawingsRepository {
  listCanvases(query: { projectId?: string | undefined }): Promise<CanvasSummary[]>;
  findCanvas(id: string): Promise<Canvas | undefined>;
  insertCanvas(canvas: Canvas): Promise<void>;
  saveCanvas(canvas: Canvas, expectedVersion: number): Promise<void>;
  canvasPreview(canvasId: string): Promise<{ sceneVersion: number; sceneFingerprint: string | null } | undefined>;
  storedPreview(canvasId: string): Promise<StoredPreview | undefined>;
  saveCanvasPreview(preview: CanvasPreviewRecord): Promise<void>;
  liveCanvasPreviewImage(
    canvasId: string,
  ): Promise<{ png: Uint8Array; sceneVersion: number; sceneFingerprint: string | null } | undefined>;
  trashCanvas(input: { id: string; at: IsoInstant; expectedVersion: number }): Promise<void>;
  restoreCanvas(input: {
    id: string;
    place: { folderId: string | null; pinnedAt: IsoInstant | null };
    at: IsoInstant;
    expectedVersion: number;
  }): Promise<void>;
  moveCanvas(input: { id: string; projectId: string; expectedVersion: number }): Promise<void>;
  placeCanvas(input: { id: string; folderId: string | null; pinnedAt: IsoInstant | null }): Promise<void>;
  setCanvasPinnedAt(input: { id: string; pinnedAt: IsoInstant | null }): Promise<void>;
  deleteCanvasRow(id: string): Promise<void>;
}

export type DrawingsPorts = DrawingsRepository & DrawingOrganization;
export type DrawingsContext = ModuleContext<DrawingsPorts>;

/** PNG decompression belongs to infrastructure. */
export interface PngImageData {
  inflate(compressed: Uint8Array, size: number): Uint8Array | undefined;
}
