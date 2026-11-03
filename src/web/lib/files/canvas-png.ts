import { exportToBlob } from '@excalidraw/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { CanvasScene } from '@tinyfold/drawings/domain';

/**
 * Renders a scene with Excalidraw itself, so the PNG keeps the hand-drawn strokes, fonts and
 * arrowheads. Serves "Exportar PNG" and the preview read by Claude Code.
 */
export async function renderCanvasPng(
  scene: CanvasScene,
  { maxSide, darkMode }: { maxSide: number; darkMode: boolean },
): Promise<Blob> {
  await document.fonts.ready;
  return exportToBlob({
    elements: scene.elements as unknown as ExcalidrawElement[],
    files: {},
    appState: { ...scene.appState, exportBackground: true, exportWithDarkMode: darkMode },
    mimeType: 'image/png',
    maxWidthOrHeight: maxSide,
  });
}

/** Stored previews always use the light theme and a background. */
export const renderLightPreview = (scene: CanvasScene, maxSide: number) =>
  renderCanvasPng(scene, { maxSide, darkMode: false });
