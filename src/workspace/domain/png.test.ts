import { describe, expect, it } from 'vitest';
import { pngChunk, pngFile, pngFrom, pngHeaderChunk, pngImage } from '../testing/png.js';
import { crc32, readPngInfo } from './png.js';

const concat = (...parts: Uint8Array[]) => new Uint8Array(parts.flatMap((part) => [...part]));

describe('drawing preview PNG', () => {
  it('reads the dimensions of a well-formed PNG, also from a view into a larger buffer', () => {
    expect(readPngInfo(pngFile(1568, 940))).toMatchObject({ width: 1568, height: 940 });
    const png = pngFile(10, 20);
    const offset = new Uint8Array(png.byteLength + 6);
    offset.set(png, 3);
    expect(readPngInfo(offset.subarray(3, 3 + png.byteLength))).toMatchObject({ width: 10, height: 20 });
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

  it('accepts only the chunks a canvas encoder writes, in their order', () => {
    const header = pngHeaderChunk(4, 4);
    const idat = pngChunk('IDAT', new Uint8Array(8));
    const end = pngChunk('IEND');
    const accepted = pngFrom([
      header,
      pngChunk('sRGB', Uint8Array.of(0)),
      pngChunk('pHYs', new Uint8Array(9)),
      idat,
      idat,
      end,
    ]);
    expect(readPngInfo(accepted)).toMatchObject({ width: 4, height: 4 });
    const palette = pngChunk('PLTE', new Uint8Array(3));
    const indexed = (...chunks: Uint8Array[]) => pngFrom([pngHeaderChunk(4, 4, { colourType: 3 }), ...chunks]);
    expect(readPngInfo(indexed(palette, idat, end))).toBeDefined();
    for (const [label, bytes] of [
      ['unknown critical chunk', pngFrom([header, pngChunk('ABCD', new Uint8Array(4)), idat, end])],
      ['compressed text', pngFrom([header, pngChunk('zTXt', new Uint8Array(8)), idat, end])],
      ['international text', pngFrom([header, pngChunk('iTXt', new Uint8Array(8)), idat, end])],
      ['colour profile', pngFrom([header, pngChunk('iCCP', new Uint8Array(8)), idat, end])],
      ['image data split by another chunk', pngFrom([header, idat, pngChunk('gAMA', new Uint8Array(4)), idat, end])],
      ['ancillary chunk after the image data', pngFrom([header, idat, pngChunk('pHYs', new Uint8Array(9)), end])],
      ['palette after the image data', indexed(idat, palette, end)],
      ['two palettes', indexed(palette, palette, idat, end)],
      ['palette in a grey image', pngFrom([pngHeaderChunk(4, 4, { colourType: 0 }), palette, idat, end])],
      ['second IHDR', pngFrom([header, header, idat, end])],
    ] as const)
      expect(readPngInfo(bytes), label).toBeUndefined();
  });

  it('states the exact size the image data must inflate to', () => {
    const sizeOf = (bytes: Uint8Array) => readPngInfo(bytes)?.inflatedSize;
    expect(sizeOf(pngFile(10, 20))).toBe(20 * (1 + 40));
    expect(sizeOf(pngFile(10, 20, 64, { colourType: 0, bitDepth: 1 }))).toBe(20 * (1 + 2));
    expect(sizeOf(pngFile(10, 20, 64, { colourType: 2, bitDepth: 16 }))).toBe(20 * (1 + 60));
    // Adam7: seven passes of rows, each with its filter byte.
    expect(sizeOf(pngFile(8, 8, 64, { interlace: 1 }))).toBe(1 * 5 + 1 * 5 + 1 * 9 + 2 * 9 + 2 * 17 + 4 * 17 + 4 * 33);
    expect(readPngInfo(pngImage(16, 2))?.imageData.byteLength).toBeGreaterThan(0);
  });
});
