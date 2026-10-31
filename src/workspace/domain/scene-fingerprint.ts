import type { CanvasScene } from './canvas.js';
import { textFingerprint } from './fingerprint.js';

/**
 * A short fingerprint of a scene's content. Renaming, moving or trashing a drawing changes its
 * version but not its scene, so the preview stays current.
 */
export function sceneFingerprint(scene: CanvasScene): string {
  return textFingerprint(JSON.stringify(scene));
}
