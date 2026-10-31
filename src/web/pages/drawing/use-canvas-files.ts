import { useNavigate } from '@tanstack/react-router';
import { MAX_CANVAS_BYTES } from '@tinyfold/workspace/domain';
import { useState } from 'react';
import { api, errorMessage, refreshWorkspace, reportSessionError } from '../../lib/api';
import type { AutosaveController } from '../../lib/autosave';
import { type CanvasSnapshot, canvasFile, canvasFileName, readCanvasImport } from '../../lib/canvas-autosave';
import { renderCanvasPng } from '../../lib/canvas-png';
import { downloadFile } from '../../lib/download';
import { useRequest } from '../../lib/use-request';
import { paths } from '../../router/paths';
import { redirectedCopyText, useCopyDestination } from '../../shell';
import { useToast } from '../../ui';

/**
 * The drawing's files: the editable .excalidraw export, the PNG in the theme on screen, an import as a new
 * drawing, and the download of a draft that could not open. An import goes to the drawing's project, or
 * elsewhere while that one is archived.
 */
export function useCanvasFiles(controller: AutosaveController<CanvasSnapshot>, canvasId: string, darkMode: boolean) {
  const toast = useToast();
  const navigate = useNavigate();
  const importRequest = useRequest();
  const findDestination = useCopyDestination();
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  function exportEditable() {
    const current = controller.getState().snapshot;
    downloadFile(
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
      const blob = await renderCanvasPng(current.scene, { maxSide: 4096, darkMode });
      downloadFile(blob, canvasFileName(current.title, 'png'));
      toast('Imagem PNG exportada.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Não foi possível exportar a imagem.', 'error');
    } finally {
      setExporting(false);
    }
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
      const own = controller.getState().snapshot.projectId;
      const { destination, projects } = await findDestination(own);
      if (!destination) {
        toast('Crie ou desarquive um projeto antes de importar.', 'error');
        return;
      }
      const input = {
        title: file.name.replace(/\.excalidraw$/i, '').slice(0, 300),
        projectId: destination.project.id,
        scene,
      };
      const imported = await api.workspace.createCanvas({ ...input, requestId: importRequest.for(input) });
      importRequest.clear();
      await refreshWorkspace();
      toast(
        destination.redirected
          ? redirectedCopyText(destination.project.name, projects.find((p) => p.id === own)?.name, 'Importado')
          : 'Arquivo importado como um novo desenho.',
      );
      void navigate({ href: paths.drawing(destination.project.id, imported.id) });
    } catch (error) {
      reportSessionError(error);
      toast(error instanceof Error ? error.message : errorMessage(error), 'error');
    } finally {
      setImporting(false);
    }
  }

  function downloadRecovery() {
    const raw = controller.getState().recoveryData;
    if (!raw) return;
    downloadFile(new Blob([raw], { type: 'application/json' }), `tinyfold-rascunho-desenho-${canvasId}.json`);
    controller.recoveryDownloaded();
  }

  return { exportEditable, exportPNG, exporting, importDrawing, importing, downloadRecovery };
}
