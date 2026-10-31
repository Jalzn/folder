/** The PNG container, checked without decoding pixels. */

export interface PngInfo {
  width: number;
  height: number;
  /** The concatenated IDAT data: one zlib stream. */
  imageData: Uint8Array;
  /** The exact size that stream must inflate to: every row of every pass with its filter byte. */
  inflatedSize: number;
}

interface Header {
  width: number;
  height: number;
  bitDepth: number;
  colourType: number;
  interlaced: boolean;
}

const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** Samples per pixel and allowed bit depths for each colour type (PNG specification, IHDR). */
const colourTypes: Record<number, { channels: number; bitDepths: readonly number[] }> = {
  0: { channels: 1, bitDepths: [1, 2, 4, 8, 16] },
  2: { channels: 3, bitDepths: [8, 16] },
  3: { channels: 1, bitDepths: [1, 2, 4, 8] },
  4: { channels: 2, bitDepths: [8, 16] },
  6: { channels: 4, bitDepths: [8, 16] },
};
/**
 * The ancillary chunks a browser's canvas encoder may write, all before the image data. Anything
 * else is refused, compressed text and colour profiles included, which a decoder would inflate.
 */
const ancillaryChunks = new Set(['tRNS', 'sRGB', 'gAMA', 'cHRM', 'pHYs']);

/**
 * The dimensions and image data of a well-formed PNG file, or undefined for anything else. Every
 * chunk must fit the file and match its CRC. The IHDR comes first with a valid format, ancillary
 * chunks and the palette (only for colour images, required for indexed ones) come before the image
 * data, the IDAT chunks are consecutive, and IEND ends the file. The image data is not inflated
 * here: the domain stays pure, and the server inflates it with `inflatedSize` as the bound.
 */
export function readPngInfo(bytes: Uint8Array): PngInfo | undefined {
  if (bytes.byteLength < signature.length || signature.some((value, index) => bytes[index] !== value)) return undefined;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let header: Header | undefined;
  let palette = false;
  const imageChunks: Uint8Array[] = [];
  for (let offset = signature.length; offset + 12 <= bytes.byteLength; ) {
    const length = view.getUint32(offset);
    const end = offset + 12 + length;
    if (end > bytes.byteLength) return undefined;
    const typeAndData = bytes.subarray(offset + 4, offset + 8 + length);
    if (crc32(typeAndData) !== view.getUint32(offset + 8 + length)) return undefined;
    const type = String.fromCharCode(...typeAndData.subarray(0, 4));
    const data = typeAndData.subarray(4);
    offset = end;
    if (!header) {
      header = type === 'IHDR' ? readHeader(data) : undefined;
      if (!header) return undefined;
    } else if (type === 'IEND') {
      if (length !== 0 || !imageChunks.length || end !== bytes.byteLength) return undefined;
      return {
        width: header.width,
        height: header.height,
        imageData: concat(imageChunks),
        inflatedSize: inflatedSize(header),
      };
    } else if (type === 'IDAT') {
      if (header.colourType === 3 && !palette) return undefined;
      imageChunks.push(data);
    } else if (imageChunks.length) {
      // Only more image data or the end may follow the image data.
      return undefined;
    } else if (type === 'PLTE') {
      if (palette || header.colourType === 0 || header.colourType === 4) return undefined;
      palette = true;
    } else if (!ancillaryChunks.has(type)) return undefined;
  }
  return undefined;
}

function readHeader(data: Uint8Array): Header | undefined {
  if (data.byteLength !== 13) return undefined;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const width = view.getUint32(0);
  const height = view.getUint32(4);
  const [bitDepth = 0, colourType = 0, compression, filter, interlace] = data.subarray(8);
  const valid =
    width > 0 &&
    height > 0 &&
    (colourTypes[colourType]?.bitDepths ?? []).includes(bitDepth) &&
    compression === 0 &&
    filter === 0 &&
    (interlace === 0 || interlace === 1);
  return valid ? { width, height, bitDepth, colourType, interlaced: interlace === 1 } : undefined;
}

/** Adam7 passes as start column, start row, column step and row step. */
const adam7 = [
  [0, 0, 8, 8],
  [4, 0, 8, 8],
  [0, 4, 4, 8],
  [2, 0, 4, 4],
  [0, 2, 2, 4],
  [1, 0, 2, 2],
  [0, 1, 1, 2],
] as const;

function inflatedSize({ width, height, bitDepth, colourType, interlaced }: Header): number {
  const bitsPerPixel = bitDepth * (colourTypes[colourType]?.channels ?? 1);
  const rowsOf = (columns: number, rows: number) =>
    columns && rows ? rows * (1 + Math.ceil((columns * bitsPerPixel) / 8)) : 0;
  if (!interlaced) return rowsOf(width, height);
  return adam7.reduce(
    (total, [startX, startY, stepX, stepY]) =>
      total + rowsOf(Math.ceil(Math.max(0, width - startX) / stepX), Math.ceil(Math.max(0, height - startY) / stepY)),
    0,
  );
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const joined = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.byteLength;
  }
  return joined;
}

let crcTable: Uint32Array | undefined;

/** CRC-32 as used by PNG chunks (polynomial 0xEDB88320). */
export function crc32(bytes: Uint8Array): number {
  crcTable ??= Uint32Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    return value >>> 0;
  });
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crcTable[(crc ^ byte) & 0xff] as number) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
