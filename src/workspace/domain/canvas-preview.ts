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
// Signature, then the IHDR chunk: length, type, width, height, five header bytes and the CRC.
const minimumLength = 8 + 4 + 4 + 13 + 4;

/** Reads the dimensions from the PNG signature and IHDR chunk; undefined for anything else. */
export function readPngInfo(bytes: Uint8Array): PngInfo | undefined {
  if (bytes.byteLength < minimumLength || signature.some((value, index) => bytes[index] !== value)) return undefined;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const type = String.fromCharCode(...bytes.subarray(12, 16));
  if (view.getUint32(8) !== 13 || type !== 'IHDR') return undefined;
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  return width > 0 && height > 0 ? { width, height } : undefined;
}

export function exceedsPreviewLimits(info: PngInfo, byteLength: number): boolean {
  return byteLength > MAX_PREVIEW_BYTES || Math.max(info.width, info.height) > MAX_PREVIEW_SIDE;
}
