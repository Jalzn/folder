import type { CanvasScene } from '@tinyfold/workspace/domain';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pngHeader } from '../../workspace/testing/png';
import {
  type CanvasPreviewOptions,
  CanvasPreviewUploader,
  PREVIEW_DELAY_MS,
  type RenderPng,
  renderPreview,
} from './canvas-preview';

const KiB = 1024;
const scene = (label = 'Servidor', isDeleted = false): CanvasScene => ({
  elements: [{ id: label, type: 'rectangle', isDeleted }],
  appState: { viewBackgroundColor: '#ffffff' },
});
const png = (side: number, bytes: number) => new Blob([pngHeader(side, Math.round(side / 2), bytes)]);
/** A renderer whose file size depends on the requested side. */
const rendererBySide = (sizes: Record<number, number>): RenderPng & { sides: number[] } => {
  const sides: number[] = [];
  return Object.assign(
    async (_scene: CanvasScene, side: number) => {
      sides.push(side);
      return png(side, sizes[side] ?? 0);
    },
    { sides },
  );
};

describe('renderPreview', () => {
  it('takes the largest side that fits 200 KiB', async () => {
    const render = rendererBySide({ 1568: 300 * KiB, 1280: 210 * KiB, 1024: 150 * KiB, 768: 90 * KiB });
    const result = await renderPreview(scene(), render);
    expect(render.sides).toEqual([1568, 1280, 1024]);
    expect(result?.size).toBe(150 * KiB);
  });

  it('accepts up to 256 KiB only at the smallest side and gives up beyond that', async () => {
    const heavy = { 1568: 900 * KiB, 1280: 700 * KiB, 1024: 400 * KiB };
    expect((await renderPreview(scene(), rendererBySide({ ...heavy, 768: 250 * KiB })))?.size).toBe(250 * KiB);
    expect(await renderPreview(scene(), rendererBySide({ ...heavy, 768: 257 * KiB }))).toBeUndefined();
  });

  it('refuses a rendering larger than the preview side', async () => {
    expect(await renderPreview(scene(), async () => png(2000, 10 * KiB))).toBeUndefined();
  });
});

describe('CanvasPreviewUploader', () => {
  let ready: boolean;
  let uploads: { id: string; version: number; png: File }[];
  let upload: ReturnType<typeof vi.fn<CanvasPreviewOptions['upload']>>;
  const uploader = (options: Partial<CanvasPreviewOptions> = {}) =>
    new CanvasPreviewUploader({
      id: 'canvas',
      previewVersion: null,
      render: async (_scene, side) => png(side, 10 * KiB),
      upload,
      ready: () => ready,
      whenIdle: (work) => work(),
      ...options,
    });
  const elapse = (ms = PREVIEW_DELAY_MS) => vi.advanceTimersByTimeAsync(ms);

  beforeEach(() => {
    vi.useFakeTimers();
    ready = true;
    uploads = [];
    upload = vi.fn(async (input) => {
      uploads.push(input);
      return { previewVersion: input.version };
    });
  });
  afterEach(() => vi.useRealTimers());

  it('uploads the newest saved version once the saves pause', async () => {
    const previews = uploader();
    previews.request(2, scene());
    await elapse(PREVIEW_DELAY_MS - 100);
    previews.request(3, scene('Editor'));
    await elapse(PREVIEW_DELAY_MS - 1);
    expect(upload).not.toHaveBeenCalled();
    await elapse(1);
    expect(uploads.map(({ version }) => version)).toEqual([3]);
    expect(uploads[0]?.png.type).toBe('image/png');
    expect(uploads[0]?.id).toBe('canvas');
  });

  it('generates one preview at a time and then the version saved meanwhile', async () => {
    const first = Promise.withResolvers<void>();
    upload.mockImplementationOnce(async (input) => {
      await first.promise;
      uploads.push(input);
      return { previewVersion: input.version };
    });
    const previews = uploader();
    previews.request(2, scene());
    await elapse();
    previews.request(3, scene());
    await elapse();
    expect(upload).toHaveBeenCalledTimes(1);
    first.resolve();
    await elapse();
    expect(uploads.map(({ version }) => version)).toEqual([2, 3]);
  });

  it('waits for a pending edit to be saved and for the pointer to be released', async () => {
    const previews = uploader();
    ready = false;
    previews.request(2, scene());
    await elapse();
    expect(upload).not.toHaveBeenCalled();
    ready = true;
    previews.hold();
    previews.request(3, scene());
    await elapse();
    expect(upload).not.toHaveBeenCalled();
    previews.release();
    await elapse();
    expect(uploads.map(({ version }) => version)).toEqual([3]);
  });

  it('skips versions the server already has and drawings without active elements', async () => {
    const previews = uploader({ previewVersion: 4 });
    previews.request(4, scene());
    previews.request(5, scene('Apagado', true));
    await elapse();
    expect(upload).not.toHaveBeenCalled();
    previews.request(6, scene());
    await elapse();
    previews.request(6, scene());
    await elapse();
    expect(uploads.map(({ version }) => version)).toEqual([6]);
  });

  it('stays silent when rendering or uploading fails and tries again on the next save', async () => {
    const previews = uploader();
    upload.mockRejectedValueOnce(new Error('offline'));
    previews.request(2, scene());
    await elapse();
    previews.request(3, scene());
    await elapse();
    expect(uploads.map(({ version }) => version)).toEqual([3]);
  });

  it('keeps the newer preview the server reports for an outdated upload', async () => {
    upload.mockResolvedValueOnce({ previewVersion: 9 });
    const previews = uploader();
    previews.request(2, scene());
    await elapse();
    previews.request(8, scene());
    await elapse();
    expect(upload).toHaveBeenCalledTimes(1);
  });
});
