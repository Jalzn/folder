import { type Canvas, type CanvasScene, canvasPlainText, readCanvasScene } from '@tinyfold/workspace/domain';
import type { ItemAdapter } from '../../components/item-page';
import { api, queryClient } from '../../lib/api';
import { defineItemSession, type ItemSession } from '../../lib/autosave/item-session';
import { type CanvasSnapshot, canvasDraftStorage, parseCanvasDraft, withCleanLinks } from '../../lib/canvas-autosave';
import { renderCanvasPng } from '../../lib/canvas-png';
import { CanvasPreviewUploader } from '../../lib/canvas-preview';
import { canvasQuery, embedsKey, keys } from '../../lib/queries';
import { displayTitle } from '../../lib/types';

/** The canvas as getCanvas returns it, including whether the stored PNG preview shows its scene. */
export type EditableCanvas = Awaited<ReturnType<typeof api.workspace.getCanvas>>;

/** Saving and preview uploads outlive the editor, so leaving right after an edit loses nothing. */
export type CanvasSession = ItemSession<CanvasSnapshot, { previews: CanvasPreviewUploader }>;

export const canvasSnapshot = (canvas: Canvas): CanvasSnapshot => ({
  title: canvas.title,
  projectId: canvas.projectId,
  // Older scenes may hold links the server now refuses; the next save cleans them.
  scene: withCleanLinks(canvas.scene),
});

/** A drawing for the actions both editors share: read it, copy it and move it to the trash. */
export const canvasItem = (id: string): ItemAdapter<CanvasSnapshot, EditableCanvas> => ({
  type: 'drawing',
  id,
  queryKey: canvasQuery(id).queryKey,
  read: () => api.workspace.getCanvas({ id }),
  snapshot: canvasSnapshot,
  createCopy: (snapshot, { projectId, folderId }, title, requestId) =>
    api.workspace.createCanvas({
      title,
      scene: snapshot.scene,
      projectId,
      ...(folderId ? { folderId } : {}),
      requestId,
    }),
  remove: (input) => api.workspace.deleteCanvas(input),
});

/** What identifies a scene's content: Excalidraw versions change for edits, not for selection or viewport. */
export const sceneRevision = (scene: CanvasScene) =>
  `${scene.appState.viewBackgroundColor}|${scene.elements
    .map((element) =>
      typeof element.version === 'number' && typeof element.versionNonce === 'number'
        ? `${element.id}:${element.version}:${element.versionNonce}:${Boolean(element.isDeleted)}`
        : JSON.stringify(element),
    )
    .join('|')}`;

/** The drawing's autosave and preview uploads, one per installation and drawing for the life of the tab. */
export const canvasSession = defineItemSession<CanvasSnapshot, EditableCanvas, { previews: CanvasPreviewUploader }>({
  type: 'drawing',
  snapshot: canvasSnapshot,
  storage: canvasDraftStorage,
  readDraft: parseCanvasDraft,
  check: (input) => {
    try {
      readCanvasScene(input.scene);
    } catch (error) {
      throw Object.assign(error instanceof Error ? error : new Error('Desenho inválido.'), { code: 'VALIDATION' });
    }
  },
  save: (input) => api.workspace.saveCanvas(input),
  saved: (previous, sent, ack) => ({
    ...previous,
    ...sent,
    title: displayTitle(sent.title.trim()),
    plainText: canvasPlainText(sent.scene),
    version: ack.version,
    updatedAt: ack.updatedAt,
    // The stored preview still shows the scene only if this save left the scene alone.
    previewCurrent: previous.previewCurrent && sceneRevision(previous.scene) === sceneRevision(sent.scene),
  }),
  // A document that embeds the drawing shows its new title and, once the preview is up, the new image.
  invalidate: [keys.canvases(), embedsKey],
  equal: (left, right) =>
    left.title === right.title &&
    left.projectId === right.projectId &&
    sceneRevision(left.scene) === sceneRevision(right.scene),
  draftDelayMs: 100,
  extra: (canvas, controller) => ({
    previews: new CanvasPreviewUploader({
      id: canvas.id,
      previewVersion: canvas.previewVersion,
      // A light rendering with background, whatever the editor theme.
      render: (scene, maxSide) => renderCanvasPng(scene, { maxSide, darkMode: false }),
      upload: async (input) => {
        const ack = await api.workspace.saveCanvasPreview(input);
        void queryClient.invalidateQueries({ queryKey: embedsKey });
        return ack;
      },
      ready: () => controller().getState().status === 'saved',
    }),
  }),
  afterSave: ({ previews }, ack, sent) => previews.request(ack.version, sent.scene),
  onAdopted: ({ previews }, adopted, version) => previews.request(version, adopted.scene),
});
