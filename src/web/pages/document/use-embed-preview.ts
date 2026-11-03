import { sceneFingerprint } from '@tinyfold/drawings/domain';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, queryClient } from '../../lib/api';
import { renderPreview } from '../../lib/files/canvas-preview';
import { type EmbeddedDrawing, embedsKey } from '../../lib/queries';
import { useLatest } from '../../lib/react/use-latest';

/** What a figure shows while its preview is made again: the old image with "Atualizando…", or none fits. */
export type PreviewWork = 'updating' | 'unavailable';

const stale = (drawing: EmbeddedDrawing) => drawing.state === 'live' && !drawing.empty && !drawing.preview?.current;

/** Waits for an idle moment of the browser, as the editor's previews do. */
const whenIdle = () =>
  new Promise<void>((resolve) => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(() => resolve(), { timeout: 2_000 });
    else setTimeout(resolve, 0);
  });

/**
 * The embedded drawings whose stored preview does not show the current scene, or that have none
 * (docs/etapas/11-documento-desenho.md, decision 4): the document makes a new one, one at a time, when the
 * browser is idle, with Excalidraw's export module loaded only then, and uploads it with the scene's
 * fingerprint; the resolver then reads the new image. A scene no preview size can hold says so. Each drawing
 * version is tried once per page; a failure stays quiet, as the editor's previews do, and the next opening
 * tries again.
 */
export function useEmbedPreviews(drawings: ReadonlyMap<string, EmbeddedDrawing>) {
  const [work, setWork] = useState<ReadonlyMap<string, PreviewWork>>(new Map());
  const latest = useLatest(drawings);
  const tried = useRef(new Set<string>());
  const running = useRef(false);
  // A job outlives the renders that started it; only leaving the page stops its updates.
  const mounted = useRef(true);
  /** Starts the next stale drawing's preview, unless one is on its way; each one ends by calling it again. */
  const pump = useCallback(() => {
    if (running.current || !mounted.current) return;
    const next = [...latest.current.values()].find(
      (drawing) =>
        stale(drawing) && !tried.current.has(`${drawing.id}@${drawing.state === 'live' ? drawing.version : 0}`),
    );
    if (next?.state !== 'live') return;
    tried.current.add(`${next.id}@${next.version}`);
    running.current = true;
    const mark = (state: PreviewWork | null) =>
      mounted.current &&
      setWork((current) => {
        const updated = new Map(current);
        if (state) updated.set(next.id, state);
        else updated.delete(next.id);
        return updated;
      });
    mark('updating');
    void (async () => {
      try {
        await whenIdle();
        const canvas = await api.workspace.getCanvas({ id: next.id });
        if (canvas.deletedAt) return mark(null);
        await import('../../lib/files/excalidraw-assets');
        const { renderLightPreview } = await import('../../lib/files/canvas-png');
        // A light rendering with background, as the drawing's own previews.
        const png = await renderPreview(canvas.scene, renderLightPreview);
        if (!png) return mark('unavailable');
        await api.workspace.saveCanvasPreview({
          id: canvas.id,
          version: canvas.version,
          sceneFingerprint: sceneFingerprint(canvas.scene),
          png: new File([png], 'preview.png', { type: 'image/png' }),
        });
        await queryClient.invalidateQueries({ queryKey: embedsKey });
        mark(null);
      } catch {
        mark(null);
      } finally {
        running.current = false;
        pump();
      }
    })();
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  // A new answer of the resolver may bring a drawing to make, as one edited elsewhere.
  useEffect(() => {
    if (drawings.size) pump();
  }, [drawings, pump]);
  return work;
}
