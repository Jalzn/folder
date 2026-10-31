import { type CanvasScene, exceedsPreviewLimits, MAX_PREVIEW_BYTES, readPngInfo } from '@tinyfold/workspace/domain';

/** Longest sides tried in order. Claude scales down anything above 1,568 px. */
export const PREVIEW_SIDES = [1568, 1280, 1024, 768];
/** Every side but the last must fit this; the last one may use up to MAX_PREVIEW_BYTES. */
export const PREVIEW_TARGET_BYTES = 200 * 1024;
/** Wait after a confirmed save, so continuous drawing produces one preview. */
export const PREVIEW_DELAY_MS = 1_500;

export type RenderPng = (scene: CanvasScene, maxSide: number) => Promise<Blob>;

/** The sharpest rendering within the preview limits, or undefined when even the smallest is too heavy. */
export async function renderPreview(scene: CanvasScene, render: RenderPng): Promise<Blob | undefined> {
  for (const [index, side] of PREVIEW_SIDES.entries()) {
    const png = await render(scene, side);
    const budget = index === PREVIEW_SIDES.length - 1 ? MAX_PREVIEW_BYTES : PREVIEW_TARGET_BYTES;
    if (png.size > budget) continue;
    const info = readPngInfo(new Uint8Array(await png.arrayBuffer()));
    return info && !exceedsPreviewLimits(info, png.size) ? png : undefined;
  }
  return undefined;
}

const hasActiveElements = (scene: CanvasScene) => scene.elements.some((element) => !element.isDeleted);

function whenBrowserIdle(work: () => void) {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(work, { timeout: 2_000 });
  else setTimeout(work, 0);
}

export interface CanvasPreviewOptions {
  id: string;
  /** The scene version of the preview the server already has. */
  previewVersion: number | null;
  render: RenderPng;
  upload: (input: { id: string; version: number; png: File }) => Promise<{ previewVersion: number | null }>;
  /** False while an edit waits to be saved; that save asks for a newer preview. */
  ready: () => boolean;
  delayMs?: number;
  whenIdle?: (work: () => void) => void;
}

/**
 * Uploads a PNG preview of the saved versions of one drawing, for Claude Code to see. Each request
 * waits for a pause after the save, no pending edit, no pressed pointer and an idle moment. One
 * preview is generated at a time, and a newer version replaces one still waiting. Failures stay
 * silent: the preview is accessory, and the next save or opening the drawing tries again.
 */
export class CanvasPreviewUploader {
  private waiting: { version: number; scene: CanvasScene } | null = null;
  private uploaded: number;
  private running = false;
  private held = false;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private options: CanvasPreviewOptions) {
    this.uploaded = options.previewVersion ?? 0;
  }

  /**
   * Asks for a preview of a saved version and the scene saved with it. Asking again for the waiting
   * version restarts its wait, which wakes a request that found an edit pending.
   */
  request(version: number, scene: CanvasScene) {
    if (version <= this.uploaded || version < (this.waiting?.version ?? 0) || !hasActiveElements(scene)) return;
    this.waiting = { version, scene };
    this.schedule();
  }

  /** The person is drawing: rendering now would compete with the editor. */
  hold() {
    this.held = true;
  }

  release() {
    this.held = false;
    if (this.waiting) this.schedule();
  }

  private schedule() {
    clearTimeout(this.timer);
    const whenIdle = this.options.whenIdle ?? whenBrowserIdle;
    this.timer = setTimeout(() => whenIdle(() => void this.run()), this.options.delayMs ?? PREVIEW_DELAY_MS);
  }

  private async run() {
    const job = this.waiting;
    if (!job || this.running || this.held || !this.options.ready()) return;
    this.waiting = null;
    // Asked again while the same version was uploading.
    if (job.version <= this.uploaded) return;
    this.running = true;
    try {
      const png = await renderPreview(job.scene, this.options.render);
      if (png) {
        const file = new File([png], 'preview.png', { type: 'image/png' });
        const ack = await this.options.upload({ id: this.options.id, version: job.version, png: file });
        this.uploaded = Math.max(this.uploaded, ack.previewVersion ?? 0);
      }
    } catch {
      // Accessory: a newer save or the next opening of the drawing tries again.
    } finally {
      this.running = false;
      if (this.waiting) this.schedule();
    }
  }
}
