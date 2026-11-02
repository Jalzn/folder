import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { ArrowDownToLine, ArrowUpFromLine, ImageDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  HiddenFileInput,
  ItemEditorDialogs,
  SaveBanners,
  TrashedItem,
  useItemEditor,
} from '../../components/item-page';
import { displayTitle, UNTITLED } from '../../lib/types';
import { FolderLabel, PageFrame, useApp, usePageCommands } from '../../shell';
import { useTheme } from '../../shell/theme';
import { canvasItem, canvasSession, canvasSnapshot, type EditableCanvas } from './canvas-session';
import { DrawingCanvas } from './DrawingCanvas';
import { DrawingHeader } from './DrawingHeader';
import { useCanvasFiles } from './use-canvas-files';
import { useSceneChanges } from './use-scene-changes';
import { useViewport } from './use-viewport';

/**
 * An open drawing: the page bar with its folder, the save state, "Exportar ▾" and the ⋯; the bands; the
 * title; and Excalidraw in a frame that takes the rest of the page, in the resolved theme.
 */
export function CanvasEditor({ canvas }: { canvas: EditableCanvas }) {
  const app = useApp();
  const theme = useTheme();
  const [{ controller, previews }] = useState(() => canvasSession(canvas, app.owner.installationId));
  const page = useItemEditor({ controller, item: canvasItem(canvas.id), persistDraft: true });
  const { state, fileInput, openImport } = page;
  const editor = useRef<ExcalidrawImperativeAPI | null>(null);
  const scene = useSceneChanges(controller, state, editor);
  const viewport = useViewport(`tinyfold:canvas-view:${app.owner.installationId}:${canvas.id}`);
  const files = useCanvasFiles(controller, canvas.id, theme.resolved === 'dark');
  // ⌘S saves now and, after a failure, tries again; ⌘K lists the item's actions under "Neste item".
  usePageCommands({
    saveNow: () => void controller.flush(),
    files: [
      { id: 'import', label: 'Importar desenho', icon: <ArrowUpFromLine size={16} />, run: openImport },
      {
        id: 'export',
        label: 'Exportar desenho editável',
        icon: <ArrowDownToLine size={16} />,
        run: files.exportEditable,
      },
      { id: 'png', label: 'Exportar PNG', icon: <ImageDown size={16} />, run: () => void files.exportPNG() },
    ],
    trash: page.openTrash,
  });

  useEffect(() => controller.receiveRemote(canvasSnapshot(canvas), canvas.version), [controller, canvas]);
  // Each opening and refetch checks the stored preview: drawings saved before previews existed, imported,
  // copied or changed elsewhere get one, and a current one is never rendered again.
  useEffect(() => {
    if (canvas.deletedAt) return;
    if (canvas.previewCurrent) previews.recordShown(canvas.scene);
    else previews.request(canvas.version, canvas.scene);
  }, [previews, canvas]);
  // Leaving mid-stroke must not keep the preview waiting for a pointer release.
  useEffect(() => () => previews.release(), [previews]);

  // In the trash with nothing local to keep, the page only leads to the trash.
  if (canvas.deletedAt && state.status === 'saved' && !state.recovered && !state.recoveryData && !state.storageFailed)
    return (
      <PageFrame>
        <TrashedItem
          title="Este desenho está na lixeira"
          description="Restaure o desenho para continuar editando."
          projectId={canvas.projectId}
        />
      </PageFrame>
    );
  const projectId = state.snapshot.projectId;
  const { title } = page;
  return (
    <PageFrame
      fill
      lead={<FolderLabel projectId={projectId} folderId={canvas.folderId} />}
      actions={
        <DrawingHeader
          canvas={canvas}
          projectId={projectId}
          status={state.status}
          files={{ ...files, exportPNG: () => void files.exportPNG() }}
          onRetry={() => void controller.flush()}
          onImport={openImport}
          onTrash={page.openTrash}
        />
      }
      bands={
        <SaveBanners
          {...page.banners}
          className="editor-banners editor-banners--wide"
          noun="Este desenho"
          trashed={Boolean(canvas.deletedAt)}
          projectId={canvas.projectId}
          onDownloadRecovery={files.downloadRecovery}
          onExport={files.exportEditable}
        />
      }
    >
      <HiddenFileInput
        inputRef={fileInput}
        accept=".excalidraw,application/vnd.excalidraw+json,application/json"
        label="Importar arquivo Excalidraw"
        onFile={(file) => void files.importDrawing(file)}
        tabbable
      />
      <div className="drawing__top">
        <h1 className="sr-only" tabIndex={-1}>
          {displayTitle(title)}
        </h1>
        <input
          className="drawing__title"
          aria-label="Título do desenho"
          value={title}
          maxLength={300}
          placeholder={UNTITLED}
          onChange={(event) => page.change({ title: event.target.value })}
        />
      </div>
      <DrawingCanvas
        scene={state.snapshot.scene}
        epoch={state.remoteEpoch}
        title={state.snapshot.title}
        theme={theme.resolved}
        editor={editor}
        changes={scene}
        viewport={viewport}
        onPointerDown={() => previews.hold()}
        onPointerUp={() => {
          controller.persistDraft();
          previews.release();
        }}
        menu={{ onImport: openImport, onExport: files.exportEditable, onExportPNG: () => void files.exportPNG() }}
      />
      <ItemEditorDialogs {...page.dialogs} />
    </PageFrame>
  );
}
