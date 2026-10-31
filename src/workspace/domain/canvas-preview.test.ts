import { describe, expect, it } from 'vitest';
import { exceedsPreviewLimits, MAX_PREVIEW_BYTES, MAX_PREVIEW_SIDE, readPngInfo } from './canvas-preview.js';
import { pngHeader } from './canvas-preview-fixtures.js';

describe('drawing preview PNG', () => {
  it('reads the dimensions of a PNG', () => {
    expect(readPngInfo(pngHeader(1568, 940))).toEqual({ width: 1568, height: 940 });
    const offset = new Uint8Array(100);
    offset.set(pngHeader(10, 20), 3);
    expect(readPngInfo(offset.subarray(3))).toEqual({ width: 10, height: 20 });
  });
  it('refuses a wrong signature, a truncated or misplaced IHDR and empty sides', () => {
    const wrong = pngHeader(10, 10);
    wrong[1] = 0x51;
    expect(readPngInfo(wrong)).toBeUndefined();
    expect(readPngInfo(pngHeader(10, 10).subarray(0, 30))).toBeUndefined();
    const notIhdr = pngHeader(10, 10);
    notIhdr[12] = 0x58;
    expect(readPngInfo(notIhdr)).toBeUndefined();
    expect(readPngInfo(pngHeader(0, 10))).toBeUndefined();
    expect(readPngInfo(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeUndefined();
  });
  it('limits the larger side and the file size', () => {
    expect(exceedsPreviewLimits({ width: MAX_PREVIEW_SIDE, height: 900 }, MAX_PREVIEW_BYTES)).toBe(false);
    expect(exceedsPreviewLimits({ width: 900, height: MAX_PREVIEW_SIDE + 1 }, 1000)).toBe(true);
    expect(exceedsPreviewLimits({ width: 900, height: 900 }, MAX_PREVIEW_BYTES + 1)).toBe(true);
  });
});
