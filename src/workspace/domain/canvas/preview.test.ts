import { describe, expect, it } from 'vitest';
import { drawingFixture } from '../../testing/canvas-scenes.js';
import { exceedsPreviewLimits, MAX_PREVIEW_BYTES, MAX_PREVIEW_SIDE, previewShowsScene } from './preview.js';
import { sceneFingerprint } from './scene-fingerprint.js';

describe('preview limits', () => {
  it('limits the larger side and the file size', () => {
    expect(exceedsPreviewLimits({ width: MAX_PREVIEW_SIDE, height: 900 }, MAX_PREVIEW_BYTES)).toBe(false);
    expect(exceedsPreviewLimits({ width: 900, height: MAX_PREVIEW_SIDE + 1 }, 1000)).toBe(true);
    expect(exceedsPreviewLimits({ width: 900, height: 900 }, MAX_PREVIEW_BYTES + 1)).toBe(true);
  });
});

describe('preview freshness', () => {
  it('compares scene fingerprints, or versions for previews saved before them', () => {
    const scene = drawingFixture();
    const changed = drawingFixture();
    changed.elements.pop();
    expect(sceneFingerprint(scene)).toBe(sceneFingerprint(drawingFixture()));
    expect(sceneFingerprint(changed)).not.toBe(sceneFingerprint(scene));
    const preview = { sceneVersion: 1, sceneFingerprint: sceneFingerprint(scene) };
    expect(previewShowsScene(preview, { version: 5, scene })).toBe(true);
    expect(previewShowsScene(preview, { version: 1, scene: changed })).toBe(false);
    expect(previewShowsScene({ sceneVersion: 1, sceneFingerprint: null }, { version: 1, scene: changed })).toBe(true);
    expect(previewShowsScene({ sceneVersion: 1, sceneFingerprint: null }, { version: 2, scene })).toBe(false);
  });
});
