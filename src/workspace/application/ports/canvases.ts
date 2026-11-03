import type { IsoInstant } from '@tinyfold/core/domain';
import type { Canvas, CanvasSummary } from '../../domain/canvas/index.js';
import type { ItemListQuery } from './documents.js';

export interface CanvasRepository {
  listCanvases(query: ItemListQuery): Promise<CanvasSummary[]>;
  findCanvas(id: string): Promise<Canvas | undefined>;
  insertCanvas(canvas: Canvas): Promise<void>;
  saveCanvas(canvas: Canvas, expectedVersion: number): Promise<void>;
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

export interface CanvasPreviewRepository {
  /** The scene the stored preview shows, without the image; null fingerprints predate them. */
  canvasPreview(canvasId: string): Promise<{ sceneVersion: number; sceneFingerprint: string | null } | undefined>;
  /** Replaces the drawing's preview. */
  saveCanvasPreview(preview: CanvasPreviewRecord): Promise<void>;
  /** The stored image of a live drawing, out of the trash, with the scene it shows. */
  liveCanvasPreviewImage(
    canvasId: string,
  ): Promise<{ png: Uint8Array; sceneVersion: number; sceneFingerprint: string | null } | undefined>;
}

/** Inflates PNG image data, which the pure domain cannot do. */
export interface PngImageData {
  /** `compressed` inflated, if it is one zlib stream of exactly `size` bytes; never inflates more. */
  inflate(compressed: Uint8Array, size: number): Uint8Array | undefined;
}
