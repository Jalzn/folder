import type { IsoInstant } from '@tinyfold/core/domain';
import type { FiledItem, ItemAck } from './items.js';
import type { JsonValue } from './json.js';

/**
 * The IDs the server gives drawings (randomUUID): lowercase UUIDs of the RFC 9562 layout, the only
 * spelling SQLite finds them by. The preview route checks an ID with it before reading.
 */
const CANVAS_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

export const isCanvasId = (id: string): boolean => CANVAS_ID.test(id);

export const MAX_CANVAS_BYTES = 1024 * 1024;
export const MAX_CANVAS_ELEMENTS = 5000;
export const RECOVERY_CANVAS_LIMITS = { maxBytes: 5 * MAX_CANVAS_BYTES, maxElements: 20_000 } as const;
export interface CanvasSceneLimits {
  maxBytes?: number;
  maxElements?: number;
}
export interface CanvasElement {
  [key: string]: JsonValue;
  id: string;
  type: string;
}
export interface CanvasScene {
  elements: CanvasElement[];
  appState: { viewBackgroundColor: string };
}
export interface CanvasSummary extends FiledItem {
  title: string;
  plainText: string;
  formatVersion: number;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
  /** The folder it is in, or null at the project's root. A trashed item keeps it as its origin. */
}
export interface Canvas extends CanvasSummary {
  scene: CanvasScene;
}
export type CanvasAck = ItemAck;
