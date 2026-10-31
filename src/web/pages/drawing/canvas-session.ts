import { type Canvas, type CanvasScene, canvasPlainText, readCanvasScene } from '@tinyfold/workspace/domain';
import { api, errorCode, queryClient, reportSessionError } from '../../lib/api';
import { AutosaveController, type SaveInput } from '../../lib/autosave';
import { type CanvasSnapshot, canvasDraftStorage, parseCanvasDraft, withCleanLinks } from '../../lib/canvas-autosave';
import { renderCanvasPng } from '../../lib/canvas-png';
import { CanvasPreviewUploader } from '../../lib/canvas-preview';
import { withDraftProject } from '../../lib/draft-project';
import { invalidateNavigation } from '../../lib/queries';
import { registerSave } from '../../lib/save-registry';

/** The canvas as getCanvas returns it, including whether the stored PNG preview shows its scene. */
export type EditableCanvas = Awaited<ReturnType<typeof api.workspace.getCanvas>>;

/** Saving and preview uploads outlive the editor, so leaving right after an edit loses nothing. */
export interface CanvasSession {
  controller: AutosaveController<CanvasSnapshot>;
  previews: CanvasPreviewUploader;
}

const sessions = new Map<string, CanvasSession>();

export const canvasSnapshot = (canvas: Canvas): CanvasSnapshot => ({
  title: canvas.title,
  projectId: canvas.projectId,
  // Older scenes may hold links the server now refuses; the next save cleans them.
  scene: withCleanLinks(canvas.scene),
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

async function send(input: SaveInput<CanvasSnapshot>) {
  try {
    readCanvasScene(input.scene);
  } catch (error) {
    throw Object.assign(error instanceof Error ? error : new Error('Desenho inválido.'), { code: 'VALIDATION' });
  }
  try {
    // A save never moves the item: moving goes through moveItem, so the project stays out of it.
    const { projectId: _project, ...save } = input;
    return await api.workspace.saveCanvas(save);
  } catch (error) {
    reportSessionError(error);
    throw error;
  }
}

/** The drawing's autosave and preview uploads, one per installation and drawing for the life of the tab. */
export function canvasSession(canvas: EditableCanvas, installationId: string): CanvasSession {
  const identity = `${installationId}:${canvas.id}`;
  let session = sessions.get(identity);
  if (session) return session;
  const previews = new CanvasPreviewUploader({
    id: canvas.id,
    previewVersion: canvas.previewVersion,
    // A light rendering with background, whatever the editor theme.
    render: (scene, maxSide) => renderCanvasPng(scene, { maxSide, darkMode: false }),
    upload: (input) => api.workspace.saveCanvasPreview(input),
    ready: () => controller.getState().status === 'saved',
  });
  const controller: AutosaveController<CanvasSnapshot> = new AutosaveController<CanvasSnapshot>({
    id: canvas.id,
    snapshot: canvasSnapshot(canvas),
    version: canvas.version,
    storage: canvasDraftStorage(installationId, canvas.id),
    readDraft: (raw) => withDraftProject(parseCanvasDraft(raw), canvas.projectId),
    equal: (left, right) =>
      left.title === right.title &&
      left.projectId === right.projectId &&
      sceneRevision(left.scene) === sceneRevision(right.scene),
    draftDelayMs: 100,
    idFactory: () => crypto.randomUUID(),
    classifyError: errorCode,
    send,
    onSaved: (ack, sent) => {
      queryClient.setQueryData<EditableCanvas>(['workspace', 'canvas', canvas.id], (previous) => {
        if (previous && previous.version > ack.version) return previous;
        const base = previous ?? canvas;
        return {
          ...base,
          ...sent,
          projectId: sent.projectId ?? base.projectId,
          title: sent.title.trim() || 'Sem título',
          plainText: canvasPlainText(sent.scene),
          version: ack.version,
          updatedAt: ack.updatedAt,
          // The stored preview still shows the scene only if this save left the scene alone.
          previewCurrent: base.previewCurrent && sceneRevision(base.scene) === sceneRevision(sent.scene),
        };
      });
      void queryClient.invalidateQueries({ queryKey: ['workspace', 'canvases'] });
      invalidateNavigation();
      previews.request(ack.version, sent.scene);
    },
    onAdopted: (adopted, version) => previews.request(version, adopted.scene),
  });
  session = { controller, previews };
  sessions.set(identity, session);
  registerSave('drawing', canvas.id, controller);
  return session;
}
