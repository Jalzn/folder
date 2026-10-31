import '../lib/excalidraw-assets';
import '@excalidraw/excalidraw/index.css';
import './canvas-editor.css';
import { CaptureUpdateAction, Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { AppState, ExcalidrawImperativeAPI, ExcalidrawProps } from '@excalidraw/excalidraw/types';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import {
  type Canvas,
  type CanvasScene,
  canvasPlainText,
  compactCanvasScene,
  MAX_CANVAS_BYTES,
  readCanvasScene,
} from '@tinyfold/workspace/domain';
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  CloudCheck,
  Folder,
  ImageDown,
  LoaderCircle,
  MoreHorizontal,
  PencilRuler,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { api, errorCode, errorMessage, queryClient, refreshWorkspace, reportSessionError } from '../lib/api';
import { AutosaveController } from '../lib/autosave';
import {
  type CanvasSnapshot,
  canvasDraftStorage,
  canvasFile,
  canvasFileName,
  downloadCanvasFile,
  parseCanvasDraft,
  readCanvasImport,
} from '../lib/canvas-autosave';
import { renderCanvasPng } from '../lib/canvas-png';
import { CanvasPreviewUploader } from '../lib/canvas-preview';
import { useCanvas, useProjects } from '../lib/queries';
import { useApp } from '../shell';
import { Dialog, EmptyState, ErrorNotice, Menu, Spinner, useAction, useRequest, useToast } from '../ui';

/** The canvas as getCanvas returns it, including whether the stored PNG preview shows its scene. */
type EditableCanvas = Awaited<ReturnType<typeof api.workspace.getCanvas>>;
/** Saving and preview uploads outlive the editor, so leaving right after an edit loses nothing. */
interface CanvasSession {
  controller: AutosaveController<CanvasSnapshot>;
  previews: CanvasPreviewUploader;
}
const sessions = new Map<string, CanvasSession>();
const unsupportedTools = new Set(['image', 'embeddable', 'iframe', 'magicframe']);
const snapshot = (canvas: Canvas): CanvasSnapshot => ({
  title: canvas.title,
  projectId: canvas.projectId,
  scene: canvas.scene,
});
const revision = (scene: CanvasScene) =>
  `${scene.appState.viewBackgroundColor}|${scene.elements
    .map((element) =>
      typeof element.version === 'number' && typeof element.versionNonce === 'number'
        ? `${element.id}:${element.version}:${element.versionNonce}:${Boolean(element.isDeleted)}`
        : JSON.stringify(element),
    )
    .join('|')}`;

function sessionFor(canvas: EditableCanvas, installationId: string): CanvasSession {
  const identity = `${installationId}:${canvas.id}`;
  let session = sessions.get(identity);
  if (!session) {
    const previews = new CanvasPreviewUploader({
      id: canvas.id,
      previewVersion: canvas.previewVersion,
      // A light rendering with background, whatever the editor theme.
      render: (scene, maxSide) => renderCanvasPng(scene, { maxSide, darkMode: false }),
      upload: (input) => api.workspace.saveCanvasPreview(input),
      ready: () => controller.getState().status === 'saved',
    });
    const controller = new AutosaveController<CanvasSnapshot>({
      id: canvas.id,
      snapshot: snapshot(canvas),
      version: canvas.version,
      storage: canvasDraftStorage(installationId, canvas.id),
      readDraft: parseCanvasDraft,
      // Excalidraw versions change for content edits, while selection and viewport stay local.
      equal: (left, right) =>
        left.title === right.title &&
        left.projectId === right.projectId &&
        revision(left.scene) === revision(right.scene),
      draftDelayMs: 100,
      idFactory: () => crypto.randomUUID(),
      classifyError: errorCode,
      send: async (input) => {
        try {
          readCanvasScene(input.scene);
        } catch (error) {
          throw Object.assign(error instanceof Error ? error : new Error('Desenho inválido.'), { code: 'VALIDATION' });
        }
        try {
          return await api.workspace.saveCanvas(input);
        } catch (error) {
          reportSessionError(error);
          throw error;
        }
      },
      onSaved: (ack, sent) => {
        queryClient.setQueryData<EditableCanvas>(['workspace', 'canvas', canvas.id], (previous) => {
          if (previous && previous.version > ack.version) return previous;
          const base = previous ?? canvas;
          return {
            ...base,
            ...sent,
            title: sent.title.trim() || 'Sem título',
            plainText: canvasPlainText(sent.scene),
            version: ack.version,
            updatedAt: ack.updatedAt,
            // The stored preview still shows the scene only if this save left the scene alone.
            previewCurrent: base.previewCurrent && revision(base.scene) === revision(sent.scene),
          };
        });
        void queryClient.invalidateQueries({ queryKey: ['workspace', 'canvases'] });
        previews.request(ack.version, sent.scene);
      },
      onAdopted: (adopted, version) => previews.request(version, adopted.scene),
    });
    session = { controller, previews };
    sessions.set(identity, session);
  }
  return session;
}

function readViewport(key: string): Partial<AppState> {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null') as {
      scrollX: number;
      scrollY: number;
      zoom: number;
    } | null;
    if (
      value &&
      Number.isFinite(value.scrollX) &&
      Number.isFinite(value.scrollY) &&
      Number.isFinite(value.zoom) &&
      value.zoom >= 0.1 &&
      value.zoom <= 30
    )
      return {
        scrollX: value.scrollX,
        scrollY: value.scrollY,
        zoom: { value: value.zoom as AppState['zoom']['value'] },
      };
  } catch {
    // A viewport preference is optional and never affects the recoverable content.
  }
  return {};
}

export function CanvasPage() {
  const { canvasId } = useParams({ from: '/desenhos/$canvasId' });
  const canvas = useCanvas(canvasId);
  if (canvas.isPending)
    return (
      <div className="page">
        <Spinner label="Abrindo desenho…" />
      </div>
    );
  if (canvas.error && !canvas.data)
    return (
      <div className="page">
        <Link to="/desenhos" className="text-button">
          <ArrowLeft size={16} />
          Desenhos
        </Link>
        <ErrorNotice error={canvas.error} retry={() => void canvas.refetch()} />
      </div>
    );
  if (!canvas.data) return null;
  return <CanvasEditor key={canvasId} canvas={canvas.data} />;
}

function CanvasEditor({ canvas }: { canvas: EditableCanvas }) {
  const app = useApp();
  const [{ controller, previews }] = useState(() => sessionFor(canvas, app.owner.installationId));
  const state = useSyncExternalStore(controller.subscribe, controller.getState);
  const projects = useProjects(true);
  const toast = useToast();
  const navigate = useNavigate();
  const action = useAction();
  const deleteRequest = useRequest();
  const copyPending = useRef<{ snapshot: CanvasSnapshot; projectId: string | null; requestId: string } | null>(null);
  const importRequest = useRequest();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reloadOpen, setReloadOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const editor = useRef<ExcalidrawImperativeAPI | null>(null);
  const latestRevision = useRef(revision(state.snapshot.scene));
  const acceptedScene = useRef(state.snapshot.scene);
  const lastEpoch = useRef(state.remoteEpoch);
  const viewportKey = `tinyfold:canvas-view:${app.owner.installationId}:${canvas.id}`;
  const viewportTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const viewport = useRef(readViewport(viewportKey));

  useEffect(() => controller.receiveRemote(snapshot(canvas), canvas.version), [controller, canvas]);
  // Each opening and refetch checks the stored preview: drawings saved before previews existed,
  // imported, copied or changed elsewhere get one, and a current one is never rendered again.
  useEffect(() => {
    if (canvas.deletedAt) return;
    if (canvas.previewCurrent) previews.recordShown(canvas.scene);
    else previews.request(canvas.version, canvas.scene);
  }, [previews, canvas]);
  useEffect(() => {
    if (lastEpoch.current !== state.remoteEpoch) {
      lastEpoch.current = state.remoteEpoch;
      latestRevision.current = revision(state.snapshot.scene);
      acceptedScene.current = state.snapshot.scene;
    }
  }, [state.remoteEpoch, state.snapshot.scene]);
  useEffect(() => {
    const retry = () => {
      if (controller.getState().status === 'error') void controller.flush();
    };
    const beforeLeave = (event: BeforeUnloadEvent) => {
      if (controller.getState().status !== 'saved') {
        controller.persistDraft();
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const hidden = () => {
      controller.persistDraft();
      if (document.visibilityState === 'hidden' && !['error', 'conflict'].includes(controller.getState().status))
        void controller.flush();
    };
    window.addEventListener('online', retry);
    window.addEventListener('beforeunload', beforeLeave);
    document.addEventListener('visibilitychange', hidden);
    if (controller.getState().recovered && controller.getState().status !== 'conflict') void controller.flush();
    return () => {
      window.removeEventListener('online', retry);
      window.removeEventListener('beforeunload', beforeLeave);
      document.removeEventListener('visibilitychange', hidden);
      clearTimeout(viewportTimer.current);
      if (controller.getState().status !== 'saved') controller.persistDraft();
      if (!['saved', 'error', 'conflict'].includes(controller.getState().status)) void controller.flush();
    };
  }, [controller]);
  // Leaving mid-stroke must not keep the preview waiting for a pointer release.
  useEffect(() => () => previews.release(), [previews]);
  useEffect(() => {
    document.title = `${state.snapshot.title || 'Sem título'} · Tinyfold`;
    return () => {
      document.title = 'Tinyfold';
    };
  }, [state.snapshot.title]);

  function update(patch: Partial<CanvasSnapshot>) {
    controller.change({ ...controller.getState().snapshot, ...patch });
  }
  function rejectMedia() {
    toast('Imagens e conteúdo incorporado ainda não são suportados nos desenhos.', 'error');
  }
  const changed: NonNullable<ExcalidrawProps['onChange']> = (elements, appState) => {
    if (unsupportedTools.has(appState.activeTool.type)) {
      editor.current?.setActiveTool({ type: 'selection' });
      rejectMedia();
      return;
    }
    if (elements.some((element) => unsupportedTools.has(element.type))) {
      rejectMedia();
      // Never retain a scene that the server cannot persist; preserve the last supported edit.
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
    const nextRevision = revision(scene);
    if (nextRevision === latestRevision.current) return;
    latestRevision.current = nextRevision;
    // The controller copies immutable content immediately, before a refetch can replace it.
    update({ scene: compactCanvasScene(scene) });
    acceptedScene.current = scene;
  };

  function exportEditable() {
    const current = controller.getState().snapshot;
    downloadCanvasFile(
      new Blob([canvasFile(current)], { type: 'application/vnd.excalidraw+json' }),
      canvasFileName(current.title, 'excalidraw'),
    );
    toast('Desenho editável exportado.');
  }
  async function exportPNG() {
    if (exporting) return;
    const current = controller.getState().snapshot;
    if (!current.scene.elements.some((element) => !element.isDeleted)) {
      toast('Adicione um elemento antes de exportar a imagem.', 'error');
      return;
    }
    setExporting(true);
    try {
      const blob = await renderCanvasPng(current.scene, { maxSide: 4096, darkMode: true });
      downloadCanvasFile(blob, canvasFileName(current.title, 'png'));
      toast('Imagem PNG exportada.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Não foi possível exportar a imagem.', 'error');
    } finally {
      setExporting(false);
    }
  }
  async function projectForNewCanvas(projectId: string | null) {
    if (!projectId) return null;
    const available = await api.workspace.listProjects({ includeArchived: true });
    const project = available.find((item) => item.id === projectId);
    return project && !project.archivedAt ? projectId : null;
  }
  async function importDrawing(file: File) {
    if (importing) return;
    if (file.size > 2 * MAX_CANVAS_BYTES) {
      toast('Escolha um arquivo Excalidraw de até 2 MiB.', 'error');
      return;
    }
    setImporting(true);
    try {
      const scene = readCanvasImport(await file.text());
      const originalProject = controller.getState().snapshot.projectId;
      const destinationProject = await projectForNewCanvas(originalProject);
      const input = {
        title: file.name.replace(/\.excalidraw$/i, '').slice(0, 300),
        projectId: destinationProject,
        scene,
      };
      const imported = await api.workspace.createCanvas({ ...input, requestId: importRequest.for(input) });
      importRequest.clear();
      await refreshWorkspace();
      toast(
        destinationProject !== originalProject
          ? 'Desenho importado sem projeto porque o projeto original está arquivado ou indisponível.'
          : 'Arquivo importado como um novo desenho.',
      );
      void navigate({ to: '/desenhos/$canvasId', params: { canvasId: imported.id } });
    } catch (error) {
      reportSessionError(error);
      toast(error instanceof Error ? error.message : errorMessage(error), 'error');
    } finally {
      setImporting(false);
    }
  }
  async function reloadRemote() {
    try {
      const current = await api.workspace.getCanvas({ id: canvas.id });
      controller.acceptRemote(snapshot(current), current.version);
      queryClient.setQueryData(['workspace', 'canvas', canvas.id], current);
      setReloadOpen(false);
      toast('Versão salva carregada.');
    } catch (error) {
      reportSessionError(error);
      toast(errorMessage(error), 'error');
    }
  }
  async function saveCopy() {
    if (copying) return;
    setCopying(true);
    const current = controller.getState().snapshot;
    try {
      if (!copyPending.current) {
        const originalSnapshot = JSON.parse(JSON.stringify(current)) as CanvasSnapshot;
        copyPending.current = {
          snapshot: originalSnapshot,
          projectId: await projectForNewCanvas(originalSnapshot.projectId),
          requestId: crypto.randomUUID(),
        };
      }
      const pending = copyPending.current;
      const copiedSnapshot = pending.snapshot;
      const copy = await api.workspace.createCanvas({
        ...copiedSnapshot,
        projectId: pending.projectId,
        title: `${copiedSnapshot.title || 'Sem título'} — cópia`.slice(0, 300),
        requestId: pending.requestId,
      });
      copyPending.current = null;
      // A newer local edit made during copying must remain recoverable on the original.
      if (JSON.stringify(copiedSnapshot) === JSON.stringify(controller.getState().snapshot)) {
        try {
          const original = await api.workspace.getCanvas({ id: canvas.id });
          if (JSON.stringify(copiedSnapshot) === JSON.stringify(controller.getState().snapshot))
            controller.acceptRemote(snapshot(original), original.version);
        } catch {
          // The acknowledged copy remains safe even when the original was trashed elsewhere.
        }
      }
      await refreshWorkspace();
      toast(
        pending.projectId !== copiedSnapshot.projectId
          ? 'Cópia salva sem projeto porque o projeto original está arquivado ou indisponível.'
          : 'Seu rascunho foi salvo em um novo desenho.',
      );
      void navigate({ to: '/desenhos/$canvasId', params: { canvasId: copy.id } });
    } catch (error) {
      if (['VALIDATION', 'DOMAIN_RULE', 'BAD_REQUEST', 'PAYLOAD_TOO_LARGE'].includes(errorCode(error) ?? ''))
        copyPending.current = null;
      reportSessionError(error);
      toast(errorMessage(error), 'error');
    } finally {
      setCopying(false);
    }
  }
  async function remove() {
    if (!(await controller.flush())) {
      toast('Resolva o salvamento antes de mover o desenho para a lixeira.', 'error');
      return;
    }
    const input = { id: canvas.id, expectedVersion: controller.getState().version };
    await action.run(
      () => api.workspace.deleteCanvas({ ...input, requestId: deleteRequest.for(input) }),
      () => {
        deleteRequest.clear();
        setDeleteOpen(false);
        toast('Desenho movido para a lixeira.');
        void navigate({ to: '/desenhos' });
      },
    );
  }
  function exportRecovery() {
    const raw = controller.getState().recoveryData;
    if (!raw) return;
    downloadCanvasFile(new Blob([raw], { type: 'application/json' }), `tinyfold-rascunho-desenho-${canvas.id}.json`);
    controller.recoveryDownloaded();
  }
  const statusText = {
    saved: 'Salvo',
    dirty: 'Salvando…',
    saving: 'Salvando…',
    error: 'Não salvo',
    conflict: 'Conflito de edição',
  }[state.status];
  if (canvas.deletedAt && state.status === 'saved' && !state.recovered && !state.recoveryData && !state.storageFailed)
    return (
      <div className="page">
        <EmptyState
          icon={<Trash2 size={30} />}
          title="Este desenho está na lixeira"
          description="Restaure o desenho para continuar editando."
        >
          <Link to="/lixeira" className="button primary">
            Abrir lixeira
          </Link>
        </EmptyState>
      </div>
    );
  return (
    <div className="canvas-page">
      <header className="editor-topbar canvas-topbar">
        <div className="breadcrumb">
          <Link to="/desenhos">
            <PencilRuler size={15} />
            <span>Desenhos</span>
          </Link>
          <span>/</span>
          <span className="current-crumb">{state.snapshot.title || 'Sem título'}</span>
        </div>
        <div className="editor-top-actions">
          <span className={`save-indicator ${state.status}`} role="status" aria-live="polite">
            {state.status === 'saved' ? (
              <CloudCheck size={15} />
            ) : ['dirty', 'saving'].includes(state.status) ? (
              <LoaderCircle size={14} className="spin" />
            ) : (
              <AlertCircle size={15} />
            )}
            <span>{statusText}</span>
          </span>
          <Menu
            label="Opções do desenho"
            trigger={<MoreHorizontal size={20} />}
            items={[
              {
                label: 'Importar desenho',
                icon: <ArrowUpFromLine size={16} />,
                action: () => fileInput.current?.click(),
                disabled: importing,
              },
              { label: 'Exportar desenho editável', icon: <ArrowDownToLine size={16} />, action: exportEditable },
              {
                label: 'Exportar PNG',
                icon: <ImageDown size={16} />,
                action: () => void exportPNG(),
                disabled: exporting,
              },
              {
                label: 'Mover para a lixeira',
                icon: <Trash2 size={16} />,
                danger: true,
                action: () => setDeleteOpen(true),
              },
            ]}
          />
        </div>
      </header>
      <input
        ref={fileInput}
        type="file"
        className="sr-only"
        accept=".excalidraw,application/vnd.excalidraw+json,application/json"
        aria-label="Importar arquivo Excalidraw"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void importDrawing(file);
        }}
      />
      {state.recoveryData && (
        <div className="editor-alert" role="alert">
          <AlertCircle size={18} />
          <div>
            <strong>Encontramos um rascunho que não pôde ser aberto.</strong>
            <span>Baixe o rascunho original para preservar seu conteúdo.</span>
          </div>
          <button type="button" className="button secondary" onClick={exportRecovery}>
            Baixar rascunho original
          </button>
        </div>
      )}
      {(state.status === 'conflict' || canvas.deletedAt) && (
        <div className="editor-alert" role="alert">
          <AlertCircle size={18} />
          <div>
            <strong>
              {canvas.deletedAt
                ? 'Este desenho foi movido para a lixeira.'
                : 'Este desenho mudou em outro dispositivo.'}
            </strong>
            <span>Seu rascunho está preservado. Escolha como continuar.</span>
          </div>
          {canvas.deletedAt ? (
            <Link to="/lixeira" className="button secondary">
              Abrir lixeira
            </Link>
          ) : (
            <button type="button" className="button secondary" onClick={() => setReloadOpen(true)}>
              Carregar versão salva
            </button>
          )}
          <button type="button" className="button primary" disabled={copying} onClick={() => void saveCopy()}>
            {copying ? 'Salvando…' : 'Salvar meu rascunho como cópia'}
          </button>
        </div>
      )}
      {state.status === 'error' && (
        <div className="editor-alert" role="alert">
          <AlertCircle size={18} />
          <div>
            <strong>Seu rascunho continua aqui.</strong>
            <span>{state.error ? errorMessage(state.error) : 'Há um salvamento pendente de confirmação.'}</span>
          </div>
          <button type="button" className="button secondary" onClick={() => void controller.flush()}>
            <RotateCcw size={15} />
            Tentar salvar
          </button>
          <button type="button" className="text-button" onClick={exportEditable}>
            Exportar cópia
          </button>
          {!canvas.deletedAt && (
            <button type="button" className="button primary" disabled={copying} onClick={() => void saveCopy()}>
              {copying ? 'Salvando…' : 'Salvar meu rascunho como cópia'}
            </button>
          )}
        </div>
      )}
      {state.storageFailed && state.status !== 'saved' && (
        <div className="editor-alert" role="alert">
          <AlertCircle size={18} />
          <span>
            O navegador não conseguiu guardar o rascunho local. Mantenha esta aba aberta até aparecer “Salvo” ou exporte
            uma cópia.
          </span>
          <button type="button" className="text-button" onClick={exportEditable}>
            Exportar cópia
          </button>
        </div>
      )}
      <div className="canvas-metadata">
        <input
          className="canvas-title"
          aria-label="Título do desenho"
          value={state.snapshot.title === 'Sem título' ? '' : state.snapshot.title}
          maxLength={300}
          placeholder="Sem título"
          onChange={(event) => update({ title: event.target.value })}
        />
        <label className="project-picker">
          <Folder size={14} />
          <select
            aria-label="Projeto do desenho"
            value={state.snapshot.projectId ?? ''}
            onChange={(event) => update({ projectId: event.target.value || null })}
          >
            <option value="">Sem projeto</option>
            {projects.data?.map((project) => (
              <option
                key={project.id}
                value={project.id}
                disabled={Boolean(project.archivedAt) && project.id !== state.snapshot.projectId}
              >
                {project.name}
                {project.archivedAt ? ' (arquivado)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div
        className="canvas-editor"
        data-testid="canvas-editor"
        onDropCapture={(event) => {
          if (event.dataTransfer.files.length || event.dataTransfer.types.includes('text/uri-list')) {
            event.preventDefault();
            event.stopPropagation();
            rejectMedia();
          }
        }}
        onPasteCapture={(event) => {
          if (event.clipboardData.files.length) {
            event.preventDefault();
            event.stopPropagation();
            rejectMedia();
          }
        }}
      >
        <Excalidraw
          key={state.remoteEpoch}
          excalidrawAPI={(value) => {
            editor.current = value;
          }}
          initialData={{
            elements: state.snapshot.scene.elements as unknown as ExcalidrawElement[],
            appState: { ...state.snapshot.scene.appState, ...viewport.current },
            files: {},
          }}
          langCode="pt-BR"
          theme="dark"
          name={state.snapshot.title || 'Sem título'}
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
          onChange={changed}
          onPointerDown={() => previews.hold()}
          onPointerUp={() => {
            controller.persistDraft();
            previews.release();
          }}
          onPaste={(data) => {
            if (
              (data.files && Object.keys(data.files).length) ||
              data.elements?.some((element) => unsupportedTools.has(element.type)) ||
              data.mixedContent?.some((item) => item.type === 'imageUrl')
            ) {
              rejectMedia();
              return false;
            }
            return true;
          }}
          onScrollChange={(scrollX, scrollY, zoom) => {
            viewport.current = { scrollX, scrollY, zoom };
            clearTimeout(viewportTimer.current);
            viewportTimer.current = setTimeout(() => {
              try {
                localStorage.setItem(viewportKey, JSON.stringify({ scrollX, scrollY, zoom: zoom.value }));
              } catch {
                /* View preferences are optional. */
              }
            }, 250);
          }}
        >
          <MainMenu>
            <MainMenu.Item onSelect={() => fileInput.current?.click()}>Importar desenho</MainMenu.Item>
            <MainMenu.Item onSelect={exportEditable}>Exportar desenho editável</MainMenu.Item>
            <MainMenu.Item onSelect={() => void exportPNG()}>Exportar PNG</MainMenu.Item>
            <MainMenu.DefaultItems.ClearCanvas />
            <MainMenu.DefaultItems.ChangeCanvasBackground />
            <MainMenu.DefaultItems.Help />
          </MainMenu>
        </Excalidraw>
      </div>
      <Dialog title="Carregar a versão salva?" open={reloadOpen} onClose={() => setReloadOpen(false)}>
        <p className="muted">
          A versão salva substituirá este rascunho. Exporte uma cópia se quiser guardar as duas versões.
        </p>
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={() => setReloadOpen(false)}>
            Cancelar
          </button>
          <button type="button" className="button primary" onClick={() => void reloadRemote()}>
            Carregar versão salva
          </button>
        </div>
      </Dialog>
      <Dialog title="Mover desenho para a lixeira?" open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <p className="muted">Você poderá restaurar o desenho depois.</p>
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={() => setDeleteOpen(false)}>
            Cancelar
          </button>
          <button type="button" className="button danger" disabled={action.busy} onClick={() => void remove()}>
            Mover para a lixeira
          </button>
        </div>
      </Dialog>
    </div>
  );
}
