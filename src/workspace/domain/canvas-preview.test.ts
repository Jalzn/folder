import { describe, expect, it } from 'vitest';
import { drawingFixture } from '../testing/canvas-scenes.js';
import { pngFile } from '../testing/png.js';
import {
  crc32,
  exceedsPreviewLimits,
  MAX_PREVIEW_BYTES,
  MAX_PREVIEW_SIDE,
  previewShowsScene,
  readPngInfo,
  sceneFingerprint,
} from './canvas-preview.js';

const concat = (...parts: Uint8Array[]) => new Uint8Array(parts.flatMap((part) => [...part]));

describe('drawing preview PNG', () => {
  it('reads the dimensions of a well-formed PNG, also from a view into a larger buffer', () => {
    expect(readPngInfo(pngFile(1568, 940))).toEqual({ width: 1568, height: 940 });
    const png = pngFile(10, 20);
    const offset = new Uint8Array(png.byteLength + 6);
    offset.set(png, 3);
    expect(readPngInfo(offset.subarray(3, 3 + png.byteLength))).toEqual({ width: 10, height: 20 });
  });
  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('IEND'))).toBe(0xae426082);
  });
  it('refuses bytes that only start like a PNG', () => {
    const html = new TextEncoder().encode('<html><script>alert(1)</script></html>');
    const headerOnly = pngFile(1568, 1568).subarray(0, 33);
    const corrupted = pngFile(10, 10);
    corrupted[20] = (corrupted[20] ?? 0) ^ 0xff;
    const wrongSignature = pngFile(10, 10);
    wrongSignature[1] = 0x51;
    for (const [label, bytes] of [
      ['wrong signature', wrongSignature],
      ['header and HTML', concat(headerOnly, html)],
      ['IHDR without the rest', headerOnly],
      ['bad CRC', corrupted],
      ['trailing bytes', concat(pngFile(10, 10), html)],
      ['no image data', pngFile(10, 10, 64, { withoutImageData: true })],
      ['bit depth 0', pngFile(10, 10, 64, { bitDepth: 0 })],
      ['colour type 9', pngFile(10, 10, 64, { colourType: 9 })],
      ['16-bit palette', pngFile(10, 10, 64, { colourType: 3, bitDepth: 16 })],
      ['palette image without PLTE', pngFile(10, 10, 64, { colourType: 3 })],
      ['zero width', pngFile(0, 10)],
      ['missing IEND', pngFile(10, 10).subarray(0, pngFile(10, 10).byteLength - 12)],
      ['SVG', new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')],
    ] as const)
      expect(readPngInfo(bytes), label).toBeUndefined();
  });
  it('limits the larger side and the file size', () => {
    expect(exceedsPreviewLimits({ width: MAX_PREVIEW_SIDE, height: 900 }, MAX_PREVIEW_BYTES)).toBe(false);
    expect(exceedsPreviewLimits({ width: 900, height: MAX_PREVIEW_SIDE + 1 }, 1000)).toBe(true);
    expect(exceedsPreviewLimits({ width: 900, height: 900 }, MAX_PREVIEW_BYTES + 1)).toBe(true);
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
});
