import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { ArrowDownToLine, ArrowUpFromLine, ImageDown } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  ReloadDialog,
  SaveBanners,
  SaveState,
  TrashedItem,
  TrashItemDialog,
  useItemActions,
} from '../../components/editor';
import { moveThroughController } from '../../lib/editor-move';
import { useHasActiveProject } from '../../lib/queries';
import { registerOpenEditor } from '../../lib/save-registry';
import { displayTitle, UNTITLED } from '../../lib/types';
import { useAutosaveLifecycle } from '../../lib/use-autosave-lifecycle';
import { usePageTitle } from '../../lib/use-page-title';
import { FolderLabel, ItemMenu, type ItemMenuAction, PageFrame, useApp, usePageCommands } from '../../shell';
import { useTheme } from '../../shell/theme';
import { canvasItem, canvasSession, canvasSnapshot, type EditableCanvas } from './canvas-session';
import { DrawingCanvas } from './DrawingCanvas';
import { useCanvasFiles } from './use-canvas-files';
import { useSceneChanges } from './use-scene-changes';
import { useViewport } from './use-viewport';

/**
 * An open drawing: the page bar with the save state and the ⋯, the bands, the title, and Excalidraw in a
 * frame that takes the rest of the page, in the resolved theme.
 */
export function CanvasEditor({ canvas }: { canvas: EditableCanvas }) {
  const app = useApp();
  const theme = useTheme();
  const [{ controller, previews }] = useState(() => canvasSession(canvas, app.owner.installationId));
  useEffect(
    () => registerOpenEditor('drawing', canvas.id, { moveTo: (move) => moveThroughController(controller, move) }),
    [controller, canvas.id],
  );
  useAutosaveLifecycle(controller, { persistDraft: true });
  const state = useSyncExternalStore(controller.subscribe, controller.getState);
  usePageTitle(state.snapshot.title);
  const editor = useRef<ExcalidrawImperativeAPI | null>(null);
  const scene = useSceneChanges(controller, state, editor);
  const viewport = useViewport(`tinyfold:canvas-view:${app.owner.installationId}:${canvas.id}`);
  const files = useCanvasFiles(controller, canvas.id, theme.resolved === 'dark');
  const actions = useItemActions(controller, canvasItem(canvas.id));
  const hasActiveProject = useHasActiveProject();
  const [trashOpen, setTrashOpen] = useState(false);
  const [reloadOpen, setReloadOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const openImport = () => fileInput.current?.click();
  const fileActions: ItemMenuAction[] = [
    {
      id: 'import',
      label: 'Importar desenho',
      icon: <ArrowUpFromLine size={16} />,
      action: openImport,
      disabled: files.importing,
    },
    {
      id: 'export',
      label: 'Exportar desenho editável',
      icon: <ArrowDownToLine size={16} />,
      action: files.exportEditable,
    },
    {
      id: 'png',
      label: 'Exportar PNG',
      icon: <ImageDown size={16} />,
      action: () => void files.exportPNG(),
      disabled: files.exporting,
    },
  ];
  // ⌘S saves now and, after a failure, tries again; ⌘K lists the item's actions under "Neste item".
  usePageCommands({
    saveNow: () => void controller.flush(),
    files: fileActions.map(({ id, label, icon, action }) => ({ id, label, icon, run: action })),
    trash: () => setTrashOpen(true),
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
  const title = state.snapshot.title === UNTITLED ? '' : state.snapshot.title;
  return (
    <PageFrame
      fill
      lead={<FolderLabel projectId={projectId} folderId={canvas.folderId} />}
      actions={
        <>
          <SaveState status={state.status} />
          <ItemMenu
            type="drawing"
            id={canvas.id}
            projectId={projectId}
            folderId={canvas.folderId}
            pinned={Boolean(canvas.pinnedAt)}
            onTrash={() => setTrashOpen(true)}
            actions={fileActions}
          />
        </>
      }
    >
      <input
        ref={fileInput}
        type="file"
        className="sr-only"
        accept=".excalidraw,application/vnd.excalidraw+json,application/json"
        aria-label="Importar arquivo Excalidraw"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void files.importDrawing(file);
        }}
      />
      <SaveBanners
        className="editor-banners editor-banners--wide"
        state={state}
        noun="Este desenho"
        trashed={Boolean(canvas.deletedAt)}
        projectId={canvas.projectId}
        canCopy={hasActiveProject}
        copying={actions.copying}
        onDownloadRecovery={files.downloadRecovery}
        onReload={() => setReloadOpen(true)}
        onSaveCopy={() => void actions.saveCopy()}
        onRetry={() => void controller.flush()}
        onExport={files.exportEditable}
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
          onChange={(event) => controller.change({ ...controller.getState().snapshot, title: event.target.value })}
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
      <TrashItemDialog
        type="drawing"
        open={trashOpen}
        pending={actions.trashing}
        onClose={() => setTrashOpen(false)}
        onConfirm={() => void actions.moveToTrash().then((moved) => moved && setTrashOpen(false))}
      />
      <ReloadDialog
        open={reloadOpen}
        onClose={() => setReloadOpen(false)}
        onConfirm={() => void actions.reloadRemote().then((loaded) => loaded && setReloadOpen(false))}
      />
    </PageFrame>
  );
}
