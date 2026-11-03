import { type CanvasScene, MAX_PREVIEW_SIDE, sceneFingerprint } from '@tinyfold/workspace/domain';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pngFile } from '../../../workspace/testing/png';
import {
  type CanvasPreviewOptions,
  CanvasPreviewUploader,
  PREVIEW_DELAY_MS,
  previewSides,
  type RenderPng,
  renderPreview,
} from './canvas-preview';

const KiB = 1024;
const scene = (label = 'Servidor', isDeleted = false): CanvasScene => ({
  elements: [{ id: label, type: 'rectangle', isDeleted }],
  appState: { viewBackgroundColor: '#ffffff' },
});
const png = (side: number, bytes: number) => new Blob([pngFile(side, Math.round(side / 2), bytes)]);
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

  it('refuses a rendering larger than the preview side and tries the next one', async () => {
    expect(await renderPreview(scene(), async () => png(2000, 10 * KiB))).toBeUndefined();
    const render = vi.fn(async (_scene: CanvasScene, side: number) => png(side === 1568 ? 1600 : side, 10 * KiB));
    expect(await renderPreview(scene(), render)).toBeDefined();
    expect(render.mock.calls.map(([, side]) => side)).toEqual([1568, 1280]);
  });

  it('never asks for a side above the server limit', () => {
    expect(previewSides()).toEqual([MAX_PREVIEW_SIDE, 1280, 1024, 768]);
    expect(previewSides(1280)).toEqual([1280, 1024, 768]);
    expect(previewSides(1000)).toEqual([1000, 768]);
    expect(previewSides(600)).toEqual([600]);
  });

  it('walks the sides it is given', async () => {
    const render = rendererBySide({ 1000: 300 * KiB, 768: 120 * KiB });
    expect((await renderPreview(scene(), render, previewSides(1000)))?.size).toBe(120 * KiB);
    expect(render.sides).toEqual([1000, 768]);
  });
});

describe('CanvasPreviewUploader', () => {
  let ready: boolean;
  let uploads: Parameters<CanvasPreviewOptions['upload']>[0][];
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
      return { stored: true, previewVersion: input.version };
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
    // The scene it shows, so the server keeps a preview rendered before a move or a rename.
    expect(uploads[0]?.sceneFingerprint).toBe(sceneFingerprint(scene('Editor')));
  });

  it('generates one preview at a time and then the version saved meanwhile', async () => {
    const first = Promise.withResolvers<void>();
    upload.mockImplementationOnce(async (input) => {
      await first.promise;
      uploads.push(input);
      return { stored: true, previewVersion: input.version };
    });
    const previews = uploader();
    previews.request(2, scene());
    await elapse();
    previews.request(3, scene('Editor'));
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

  it('wakes a version that waited for a pending edit when it is asked for again', async () => {
    const previews = uploader();
    ready = false;
    previews.request(2, scene());
    await elapse();
    expect(upload).not.toHaveBeenCalled();
    ready = true;
    previews.request(2, scene());
    await elapse();
    expect(uploads.map(({ version }) => version)).toEqual([2]);
  });

  it('uploads a version once when it is asked for again during its upload', async () => {
    const first = Promise.withResolvers<void>();
    upload.mockImplementationOnce(async (input) => {
      await first.promise;
      uploads.push(input);
      return { stored: true, previewVersion: input.version };
    });
    const previews = uploader();
    previews.request(2, scene());
    await elapse();
    previews.request(2, scene());
    first.resolve();
    await elapse();
    await elapse();
    expect(upload).toHaveBeenCalledTimes(1);
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

  it('renders nothing for a scene the stored preview already shows', async () => {
    const render = vi.fn(async (_scene: CanvasScene, side: number) => png(side, 10 * KiB));
    const previews = uploader({ render });
    previews.recordShown(scene('Servidor'));
    // A rename, a move or a title edit saves a new version of the same scene.
    previews.request(2, scene('Servidor'));
    await elapse();
    expect(render).not.toHaveBeenCalled();
    previews.request(3, scene('Editor'));
    await elapse();
    previews.request(4, scene('Editor'));
    await elapse();
    expect(uploads.map(({ version }) => version)).toEqual([3]);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('drops a waiting scene once the newest one is known to be shown', async () => {
    const previews = uploader();
    previews.request(2, scene('Editor'));
    previews.recordShown(scene('Editor'));
    previews.request(3, scene('Servidor'));
    previews.request(4, scene('Editor'));
    await elapse();
    expect(upload).not.toHaveBeenCalled();
  });

  it('remembers a scene too heavy for every size until it changes', async () => {
    const render = rendererBySide({});
    const heavy = vi.fn(async (drawing: CanvasScene, side: number) =>
      drawing.elements[0]?.id === 'Pesado' ? png(side, 300 * KiB) : render(drawing, side),
    );
    const previews = uploader({ render: heavy });
    previews.request(2, scene('Pesado'));
    await elapse();
    previews.request(3, scene('Pesado'));
    await elapse();
    expect(heavy).toHaveBeenCalledTimes(4);
    expect(upload).not.toHaveBeenCalled();
    previews.request(4, scene('Leve'));
    await elapse();
    expect(uploads.map(({ version }) => version)).toEqual([4]);
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
    upload.mockResolvedValueOnce({ stored: false, previewVersion: 9 });
    const previews = uploader();
    previews.request(2, scene());
    await elapse();
    previews.request(8, scene());
    await elapse();
    expect(upload).toHaveBeenCalledTimes(1);
  });
});
