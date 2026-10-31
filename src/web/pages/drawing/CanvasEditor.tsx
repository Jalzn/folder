import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { ArrowDownToLine, ArrowUpFromLine, ImageDown } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { SaveState, TrashedItem } from '../../components/editor';
import { moveThroughController } from '../../lib/editor-move';
import { useProjects } from '../../lib/queries';
import { registerOpenEditor } from '../../lib/save-registry';
import { useAutosaveLifecycle } from '../../lib/use-autosave-lifecycle';
import { usePageTitle } from '../../lib/use-page-title';
import { ItemMenu, PageFrame, useApp, usePageCommands } from '../../shell';
import { useTheme } from '../../shell/theme';
import { AlertDialog } from '../../ui';
import { CanvasBanners } from './CanvasBanners';
import { canvasSession, canvasSnapshot, type EditableCanvas } from './canvas-session';
import { DrawingCanvas } from './DrawingCanvas';
import { useCanvasActions } from './use-canvas-actions';
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
  // ⌘S saves now and, after a failure, tries again.
  usePageCommands({ saveNow: () => void controller.flush() });
  useAutosaveLifecycle(controller, { persistDraft: true });
  const state = useSyncExternalStore(controller.subscribe, controller.getState);
  usePageTitle(state.snapshot.title);
  const editor = useRef<ExcalidrawImperativeAPI | null>(null);
  const scene = useSceneChanges(controller, state, editor);
  const viewport = useViewport(`tinyfold:canvas-view:${app.owner.installationId}:${canvas.id}`);
  const files = useCanvasFiles(controller, canvas.id, theme.resolved === 'dark');
  const actions = useCanvasActions(controller, canvas);
  const hasActiveProject = (useProjects(true).data ?? []).some((project) => !project.archivedAt);
  const [trashOpen, setTrashOpen] = useState(false);
  const [reloadOpen, setReloadOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

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
  const projectId = state.snapshot.projectId ?? canvas.projectId ?? '';
  const title = state.snapshot.title === 'Sem título' ? '' : state.snapshot.title;
  const openImport = () => fileInput.current?.click();
  return (
    <PageFrame
      fill
      actions={
        <>
          <SaveState status={state.status} />
          <ItemMenu
            type="drawing"
            id={canvas.id}
            projectId={projectId}
            pinned={Boolean(canvas.pinnedAt)}
            onTrash={() => setTrashOpen(true)}
            actions={[
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
            ]}
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
      <CanvasBanners
        state={state}
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
          {title || 'Sem título'}
        </h1>
        <input
          className="drawing__title"
          aria-label="Título do desenho"
          value={title}
          maxLength={300}
          placeholder="Sem título"
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
      <AlertDialog
        open={trashOpen}
        title="Mover desenho para a lixeira?"
        confirmLabel="Mover para a lixeira"
        isPending={actions.trashing}
        onClose={() => setTrashOpen(false)}
        onConfirm={() => void actions.moveToTrash().then((moved) => moved && setTrashOpen(false))}
      >
        <p>Você poderá restaurar o desenho depois.</p>
      </AlertDialog>
      <AlertDialog
        open={reloadOpen}
        title="Carregar a versão salva?"
        confirmLabel="Carregar versão salva"
        destructive={false}
        onClose={() => setReloadOpen(false)}
        onConfirm={() => void actions.reloadRemote().then((loaded) => loaded && setReloadOpen(false))}
      >
        <p>A versão salva substituirá este rascunho. Exporte uma cópia se quiser guardar as duas versões.</p>
      </AlertDialog>
    </PageFrame>
  );
}
