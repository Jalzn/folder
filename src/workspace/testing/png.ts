import { crc32 } from '../domain/canvas-preview.js';

export interface PngFileOptions {
  bitDepth?: number;
  colourType?: number;
  /** Leaves out the image data chunk. */
  withoutImageData?: boolean;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(12 + data.byteLength);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, data.byteLength);
  bytes.set(new TextEncoder().encode(type), 4);
  bytes.set(data, 8);
  view.setUint32(8 + data.byteLength, crc32(bytes.subarray(4, 8 + data.byteLength)));
  return bytes;
}

/**
 * A well-formed PNG file of the given size, padded with image data to `byteLength` (at least 57
 * bytes). The image data is not decodable, which suits checks that never decode pixels.
 */
export function pngFile(
  width: number,
  height: number,
  byteLength = 64,
  options: PngFileOptions = {},
): Uint8Array<ArrayBuffer> {
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header.set([options.bitDepth ?? 8, options.colourType ?? 6, 0, 0, 0], 8);
  const parts = [
    Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    ...(options.withoutImageData ? [] : [chunk('IDAT', new Uint8Array(Math.max(0, byteLength - 57)))]),
    chunk('IEND', new Uint8Array()),
  ];
  const file = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    file.set(part, offset);
    offset += part.byteLength;
  }
  return file;
}
