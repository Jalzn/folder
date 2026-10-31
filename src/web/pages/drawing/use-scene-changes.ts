import { CaptureUpdateAction } from '@excalidraw/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { ExcalidrawImperativeAPI, ExcalidrawProps } from '@excalidraw/excalidraw/types';
import { type CanvasScene, compactCanvasScene } from '@tinyfold/workspace/domain';
import { type RefObject, useEffect, useRef } from 'react';
import type { AutosaveController, SaveState } from '../../lib/autosave';
import { type CanvasSnapshot, withCleanLinks } from '../../lib/canvas-autosave';
import { useToast } from '../../ui';
import { sceneRevision } from './canvas-session';

const unsupportedTools = new Set(['image', 'embeddable', 'iframe', 'magicframe']);

/**
 * Turns Excalidraw's changes into the drawing's autosave, content edits only. Images and embedded content
 * are refused with a toast, and the scene goes back to its last supported edit, so the server never
 * receives what it cannot keep.
 */
export function useSceneChanges(
  controller: AutosaveController<CanvasSnapshot>,
  state: SaveState<CanvasSnapshot>,
  editor: RefObject<ExcalidrawImperativeAPI | null>,
) {
  const toast = useToast();
  const latestRevision = useRef(sceneRevision(state.snapshot.scene));
  const acceptedScene = useRef(state.snapshot.scene);
  const lastEpoch = useRef(state.remoteEpoch);
  useEffect(() => {
    if (lastEpoch.current === state.remoteEpoch) return;
    lastEpoch.current = state.remoteEpoch;
    latestRevision.current = sceneRevision(state.snapshot.scene);
    acceptedScene.current = state.snapshot.scene;
  }, [state.remoteEpoch, state.snapshot.scene]);

  function rejectMedia() {
    toast('Imagens e conteúdo incorporado ainda não são suportados nos desenhos.', 'error');
  }

  const onChange: NonNullable<ExcalidrawProps['onChange']> = (elements, appState) => {
    if (unsupportedTools.has(appState.activeTool.type)) {
      editor.current?.setActiveTool({ type: 'selection' });
      rejectMedia();
      return;
    }
    if (elements.some((element) => unsupportedTools.has(element.type))) {
      rejectMedia();
      editor.current?.updateScene({
        elements: acceptedScene.current.elements as unknown as ExcalidrawElement[],
        appState: { ...acceptedScene.current.appState, selectedElementIds: {} },
        captureUpdate: CaptureUpdateAction.NEVER,
      });
      return;
    }
    const scene: CanvasScene = {
      elements: elements as unknown as CanvasScene['elements'],
      appState: { viewBackgroundColor: appState.viewBackgroundColor },
    };
    const revision = sceneRevision(scene);
    if (revision === latestRevision.current) return;
    latestRevision.current = revision;
    // The controller copies immutable content immediately, before a refetch can replace it. Pasted content
    // can bring links with line breaks or separators, which the server refuses.
    controller.change({ ...controller.getState().snapshot, scene: compactCanvasScene(withCleanLinks(scene)) });
    acceptedScene.current = scene;
  };

  const onPaste: NonNullable<ExcalidrawProps['onPaste']> = (data) => {
    if (
      (data.files && Object.keys(data.files).length) ||
      data.elements?.some((element) => unsupportedTools.has(element.type)) ||
      data.mixedContent?.some((item) => item.type === 'imageUrl')
    ) {
      rejectMedia();
      return false;
    }
    return true;
  };

  return { onChange, onPaste, rejectMedia };
}
