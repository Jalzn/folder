import type { CanvasScene } from './index.js';
import type { PngInfo } from './png.js';
import { sceneFingerprint } from './scene-fingerprint.js';

/**
 * The PNG preview of a drawing, rendered by the browser after a save. 1,568 px is the side above
 * which Claude scales images down; the byte cap protects the agent's output limit.
 */
export const MAX_PREVIEW_SIDE = 1568;
export const MAX_PREVIEW_BYTES = 256 * 1024;

/** Whether a stored preview shows the current scene; previews saved before fingerprints compare versions. */
export function previewShowsScene(
  preview: { sceneVersion: number; sceneFingerprint: string | null },
  canvas: { version: number; scene: CanvasScene },
): boolean {
  return preview.sceneFingerprint === null
    ? preview.sceneVersion === canvas.version
    : preview.sceneFingerprint === sceneFingerprint(canvas.scene);
}

export function exceedsPreviewLimits(info: Pick<PngInfo, 'width' | 'height'>, byteLength: number): boolean {
  return byteLength > MAX_PREVIEW_BYTES || Math.max(info.width, info.height) > MAX_PREVIEW_SIDE;
}
