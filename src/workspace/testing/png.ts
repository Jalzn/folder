import { crc32 } from '../domain/png.js';

export interface PngHeaderOptions {
  bitDepth?: number;
  colourType?: number;
  interlace?: number;
}

export interface PngFileOptions extends PngHeaderOptions {
  /** Leaves out the image data chunk. */
  withoutImageData?: boolean;
}

/** One chunk: length, type, data and CRC. */
export function pngChunk(type: string, data: Uint8Array = new Uint8Array()): Uint8Array {
  const bytes = new Uint8Array(12 + data.byteLength);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, data.byteLength);
  bytes.set(new TextEncoder().encode(type), 4);
  bytes.set(data, 8);
  view.setUint32(8 + data.byteLength, crc32(bytes.subarray(4, 8 + data.byteLength)));
  return bytes;
}

export function pngHeaderChunk(width: number, height: number, options: PngHeaderOptions = {}): Uint8Array {
  const data = new Uint8Array(13);
  const view = new DataView(data.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  data.set([options.bitDepth ?? 8, options.colourType ?? 6, 0, 0, options.interlace ?? 0], 8);
  return pngChunk('IHDR', data);
}

/** The PNG signature followed by the given chunks. */
export function pngFrom(chunks: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  const parts = [Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), ...chunks];
  const file = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    file.set(part, offset);
    offset += part.byteLength;
  }
  return file;
}

/**
 * A well-formed PNG container of the given size, padded with image data to `byteLength` (at least
 * 57 bytes). The image data does not inflate, which suits checks that never decode it.
 */
export function pngFile(
  width: number,
  height: number,
  byteLength = 64,
  options: PngFileOptions = {},
): Uint8Array<ArrayBuffer> {
  return pngFrom([
    pngHeaderChunk(width, height, options),
    ...(options.withoutImageData ? [] : [pngChunk('IDAT', new Uint8Array(Math.max(0, byteLength - 57)))]),
    pngChunk('IEND'),
  ]);
}

/** A zlib stream of uncompressed blocks: the simplest stream a test can build without a compressor. */
export function storedZlib(raw: Uint8Array): Uint8Array {
  const blocks: Uint8Array[] = [Uint8Array.from([0x78, 0x01])];
  for (let offset = 0; offset < raw.byteLength || offset === 0; offset += 0xffff) {
    const piece = raw.subarray(offset, offset + 0xffff);
    const block = new Uint8Array(5 + piece.byteLength);
    const last = offset + 0xffff >= raw.byteLength ? 1 : 0;
    block.set([
      last,
      piece.byteLength & 0xff,
      piece.byteLength >> 8,
      ~piece.byteLength & 0xff,
      (~piece.byteLength >> 8) & 0xff,
    ]);
    block.set(piece, 5);
    blocks.push(block);
  }
  let a = 1;
  let b = 0;
  for (const byte of raw) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  const adler = new Uint8Array(4);
  new DataView(adler.buffer).setUint32(0, ((b << 16) | a) >>> 0);
  blocks.push(adler);
  return Uint8Array.from(blocks.flatMap((block) => [...block]));
}

/**
 * A decodable black PNG of the given size: one bit per pixel, so even 1,568 × 940 stays below
 * 256 KiB without a compressor.
 */
export function pngImage(width: number, height: number): Uint8Array<ArrayBuffer> {
  const raw = new Uint8Array(height * (1 + Math.ceil(width / 8)));
  return pngFrom([
    pngHeaderChunk(width, height, { bitDepth: 1, colourType: 0 }),
    pngChunk('IDAT', storedZlib(raw)),
    pngChunk('IEND'),
  ]);
}
