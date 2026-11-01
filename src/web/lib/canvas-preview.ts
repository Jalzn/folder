import {
  type CanvasScene,
  exceedsPreviewLimits,
  MAX_PREVIEW_BYTES,
  MAX_PREVIEW_SIDE,
  readPngInfo,
  sceneFingerprint,
} from '@tinyfold/workspace/domain';

/** Every side but the last must fit this; the last one may use up to MAX_PREVIEW_BYTES. */
export const PREVIEW_TARGET_BYTES = 200 * 1024;
/** Wait after a confirmed save, so continuous drawing produces one preview. */
export const PREVIEW_DELAY_MS = 1_500;

/**
 * Longest sides to try, largest first: the server's limit, the side above which Claude scales
 * images down, then smaller steps for drawings whose PNG is too heavy.
 */
export function previewSides(maxSide = MAX_PREVIEW_SIDE): number[] {
  return [...new Set([maxSide, 1280, 1024, 768].filter((side) => side <= maxSide))];
}

export type RenderPng = (scene: CanvasScene, maxSide: number) => Promise<Blob>;

/**
 * The sharpest rendering within the preview limits, or undefined when even the smallest is too
 * heavy. A rendering the server would refuse moves on to the next side.
 */
export async function renderPreview(
  scene: CanvasScene,
  render: RenderPng,
  sides = previewSides(),
): Promise<Blob | undefined> {
  for (const [index, side] of sides.entries()) {
    const png = await render(scene, side);
    const budget = index === sides.length - 1 ? MAX_PREVIEW_BYTES : PREVIEW_TARGET_BYTES;
    if (png.size > budget) continue;
    const info = readPngInfo(new Uint8Array(await png.arrayBuffer()));
    if (info && !exceedsPreviewLimits(info, png.size)) return png;
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
  upload: (input: {
    id: string;
    version: number;
    /** The scene's sceneFingerprint: a preview rendered before a move or a rename still counts for it. */
    sceneFingerprint: string;
    png: File;
  }) => Promise<{ stored: boolean; previewVersion: number | null }>;
  /** False while an edit waits to be saved; that save asks for a newer preview. */
  ready: () => boolean;
  delayMs?: number;
  whenIdle?: (work: () => void) => void;
}

interface PreviewJob {
  version: number;
  scene: CanvasScene;
  fingerprint: string;
}

/**
 * Uploads a PNG preview of the saved versions of one drawing, for Claude Code to see. Each request
 * waits for a pause after the save, no pending edit, no pressed pointer and an idle moment. One
 * preview is generated at a time, and a newer version replaces one still waiting. A scene the
 * server's preview already shows is skipped, so renames, moves and title edits render nothing, and
 * so is a scene too heavy for every size, until it changes. Failures stay silent: the preview is
 * accessory, and the next save or opening the drawing tries again.
 */
export class CanvasPreviewUploader {
  private waiting: PreviewJob | null = null;
  private uploaded: number;
  /** Fingerprints of the scene the server's preview shows and of one no preview size can hold. */
  private shown: string | null = null;
  private unrenderable: string | null = null;
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
    const fingerprint = sceneFingerprint(scene);
    if (fingerprint === this.shown || fingerprint === this.unrenderable) {
      // The newest scene needs no preview, so an older one still waiting would be outdated.
      this.waiting = null;
      return;
    }
    this.waiting = { version, scene, fingerprint };
    this.schedule();
  }

  /** The server's preview shows this scene, as getCanvas reports with previewCurrent. */
  recordShown(scene: CanvasScene) {
    this.shown = sceneFingerprint(scene);
    if (this.waiting?.fingerprint === this.shown) this.waiting = null;
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
    // Uploaded, or reported as shown, while this job waited.
    if (job.version <= this.uploaded || job.fingerprint === this.shown) return;
    this.running = true;
    try {
      const png = await renderPreview(job.scene, this.options.render);
      if (!png) {
        this.unrenderable = job.fingerprint;
        return;
      }
      const file = new File([png], 'preview.png', { type: 'image/png' });
      const ack = await this.options.upload({
        id: this.options.id,
        version: job.version,
        sceneFingerprint: job.fingerprint,
        png: file,
      });
      this.uploaded = Math.max(this.uploaded, ack.previewVersion ?? 0);
      if (ack.stored) this.shown = job.fingerprint;
    } catch {
      // Accessory: a newer save or the next opening of the drawing tries again.
    } finally {
      this.running = false;
      if (this.waiting) this.schedule();
    }
  }
}
