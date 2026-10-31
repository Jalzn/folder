import { inflateSync } from 'node:zlib';
import type { PngImageData } from '../application/ports.js';

/** zlib inflation bounded by the size the PNG header declares, so a crafted file cannot exhaust memory. */
export const zlibImageData: PngImageData = {
  inflate(compressed, size) {
    try {
      const { buffer, engine } = inflateSync(compressed, { maxOutputLength: size, info: true }) as unknown as {
        buffer: Uint8Array;
        engine: { bytesWritten: number };
      };
      // bytesWritten counts the input consumed, so data after the end of the stream is caught.
      return buffer.byteLength === size && engine.bytesWritten === compressed.byteLength ? buffer : undefined;
    } catch {
      return undefined;
    }
  },
};
