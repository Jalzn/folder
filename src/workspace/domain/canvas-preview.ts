import type { CanvasScene } from './canvas.js';

/**
 * The PNG preview of a drawing, rendered by the browser after a save. 1,568 px is the side above
 * which Claude scales images down; the byte cap protects the agent's output limit.
 */
export const MAX_PREVIEW_SIDE = 1568;
export const MAX_PREVIEW_BYTES = 256 * 1024;

export interface PngInfo {
  width: number;
  height: number;
}

const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** Bit depths allowed for each colour type (PNG specification, IHDR). */
const bitDepths: Record<number, readonly number[]> = {
  0: [1, 2, 4, 8, 16],
  2: [8, 16],
  3: [1, 2, 4, 8],
  4: [8, 16],
  6: [8, 16],
};

/**
 * The dimensions of a well-formed PNG file, or undefined for anything else. Every chunk must fit the
 * file and match its CRC; the IHDR must come first with a valid format, image data must follow (after
 * the palette when there is one), and the file must end with IEND. The pixels are not decoded.
 */
export function readPngInfo(bytes: Uint8Array): PngInfo | undefined {
  if (bytes.byteLength < signature.length || signature.some((value, index) => bytes[index] !== value)) return undefined;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let info: PngInfo | undefined;
  let colourType = -1;
  let palette = false;
  let imageData = false;
  for (let offset = signature.length; offset + 12 <= bytes.byteLength; ) {
    const length = view.getUint32(offset);
    const end = offset + 12 + length;
    if (end > bytes.byteLength) return undefined;
    const typeAndData = bytes.subarray(offset + 4, offset + 8 + length);
    if (crc32(typeAndData) !== view.getUint32(offset + 8 + length)) return undefined;
    const type = String.fromCharCode(...typeAndData.subarray(0, 4));
    const data = new DataView(bytes.buffer, bytes.byteOffset + offset + 8, length);
    if (!info) {
      if (type !== 'IHDR') return undefined;
      info = readHeader(data);
      if (!info) return undefined;
      colourType = data.getUint8(9);
    } else if (type === 'PLTE') palette = true;
    else if (type === 'IDAT') {
      if (colourType === 3 && !palette) return undefined;
      imageData = true;
    } else if (type === 'IEND') return length === 0 && imageData && end === bytes.byteLength ? info : undefined;
    else if (type === 'IHDR') return undefined;
    offset = end;
  }
  return undefined;
}

function readHeader(data: DataView): PngInfo | undefined {
  if (data.byteLength !== 13) return undefined;
  const width = data.getUint32(0);
  const height = data.getUint32(4);
  const [bitDepth, colourType, compression, filter, interlace] = [8, 9, 10, 11, 12].map((at) => data.getUint8(at));
  const valid =
    width > 0 &&
    height > 0 &&
    (bitDepths[colourType as number] ?? []).includes(bitDepth as number) &&
    compression === 0 &&
    filter === 0 &&
    (interlace === 0 || interlace === 1);
  return valid ? { width, height } : undefined;
}

/**
 * A short fingerprint of a scene's content. Renaming, moving or trashing a drawing changes its
 * version but not its scene, so the preview stays current.
 */
export function sceneFingerprint(scene: CanvasScene): string {
  // cyrb53: a fast 53-bit string hash; collisions only cost a stale image label.
  const text = JSON.stringify(scene);
  let first = 0xdeadbeef;
  let second = 0x41c6ce57;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    first = Math.imul(first ^ code, 2654435761);
    second = Math.imul(second ^ code, 1597334677);
  }
  first = Math.imul(first ^ (first >>> 16), 2246822507) ^ Math.imul(second ^ (second >>> 13), 3266489909);
  second = Math.imul(second ^ (second >>> 16), 2246822507) ^ Math.imul(first ^ (first >>> 13), 3266489909);
  return (4294967296 * (2097151 & second) + (first >>> 0)).toString(16);
}

/** Whether a stored preview shows the current scene; previews saved before fingerprints compare versions. */
export function previewShowsScene(
  preview: { sceneVersion: number; sceneFingerprint: string | null },
  canvas: { version: number; scene: CanvasScene },
): boolean {
  return preview.sceneFingerprint === null
    ? preview.sceneVersion === canvas.version
    : preview.sceneFingerprint === sceneFingerprint(canvas.scene);
}

export function exceedsPreviewLimits(info: PngInfo, byteLength: number): boolean {
  return byteLength > MAX_PREVIEW_BYTES || Math.max(info.width, info.height) > MAX_PREVIEW_SIDE;
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
