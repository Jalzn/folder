import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import type { CanvasScene } from '@tinyfold/workspace/domain';
import type { RefObject } from 'react';
import type { useSceneChanges } from './use-scene-changes';
import type { useViewport } from './use-viewport';

/**
 * Excalidraw in the drawing's frame, in the resolved theme, without the tools and file actions the server
 * cannot keep. Files dropped or pasted onto the frame are refused before Excalidraw sees them. A new
 * `epoch` (a version taken from elsewhere) mounts the scene again.
 */
export function DrawingCanvas({
  scene,
  epoch,
  title,
  theme,
  editor,
  changes,
  viewport,
  onPointerDown,
  onPointerUp,
  menu,
}: {
  scene: CanvasScene;
  epoch: number;
  title: string;
  theme: 'light' | 'dark';
  editor: RefObject<ExcalidrawImperativeAPI | null>;
  changes: ReturnType<typeof useSceneChanges>;
  viewport: ReturnType<typeof useViewport>;
  onPointerDown: () => void;
  onPointerUp: () => void;
  menu: { onImport: () => void; onExport: () => void; onExportPNG: () => void };
}) {
  return (
    <div
      className="drawing__frame"
      data-testid="canvas-editor"
      onDropCapture={(event) => {
        if (event.dataTransfer.files.length || event.dataTransfer.types.includes('text/uri-list')) {
          event.preventDefault();
          event.stopPropagation();
          changes.rejectMedia();
        }
      }}
      onPasteCapture={(event) => {
        if (event.clipboardData.files.length) {
          event.preventDefault();
          event.stopPropagation();
          changes.rejectMedia();
        }
      }}
    >
      <Excalidraw
        key={epoch}
        excalidrawAPI={(value) => {
          editor.current = value;
        }}
        initialData={{
          elements: scene.elements as unknown as ExcalidrawElement[],
          appState: { ...scene.appState, ...viewport.saved() },
          files: {},
        }}
        langCode="pt-BR"
        theme={theme}
        name={title || 'Sem título'}
        handleKeyboardGlobally={false}
        aiEnabled={false}
        UIOptions={{
          tools: { image: false },
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: false,
            saveAsImage: false,
            toggleTheme: false,
          },
        }}
        validateEmbeddable={false}
        onChange={changes.onChange}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPaste={changes.onPaste}
        onScrollChange={viewport.changed}
      >
        <MainMenu>
          <MainMenu.Item onSelect={menu.onImport}>Importar desenho</MainMenu.Item>
          <MainMenu.Item onSelect={menu.onExport}>Exportar desenho editável</MainMenu.Item>
          <MainMenu.Item onSelect={menu.onExportPNG}>Exportar PNG</MainMenu.Item>
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
          <MainMenu.DefaultItems.Help />
        </MainMenu>
      </Excalidraw>
    </div>
  );
}
