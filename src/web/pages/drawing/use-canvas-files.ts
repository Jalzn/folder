import { useNavigate } from '@tanstack/react-router';
import { MAX_CANVAS_BYTES } from '@tinyfold/workspace/domain';
import { useState } from 'react';
import { DRAFT_DOWNLOADED, downloadDraft } from '../../components/item-page/draft-download';
import { api, errorMessage, queryClient, refreshWorkspace } from '../../lib/api';
import type { AutosaveController } from '../../lib/autosave';
import { type CanvasSnapshot, canvasFile, canvasFileName, readCanvasImport } from '../../lib/autosave/canvas-autosave';
import { renderCanvasPng } from '../../lib/files/canvas-png';
import { downloadFile } from '../../lib/files/download';
import { inFolderOrRoot } from '../../lib/folder-fallback';
import { canvasQuery } from '../../lib/queries';
import { useRequest } from '../../lib/writes/use-request';
import { paths } from '../../navigation/paths';
import { copyFolder, redirectedCopyText, useCopyDestination } from '../../shell';
import { useToast } from '../../ui';

/**
 * The drawing's files: the editable .excalidraw export, the PNG in the theme on screen, an import as a new
 * drawing, and the download of a draft that could not open. An import goes to the drawing's project and
 * folder, or to the root of another project while that one is archived.
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
      // In this drawing's folder when it stays in its project (decision 15).
      const open = queryClient.getQueryData<{ folderId: string | null }>(canvasQuery(canvasId).queryKey);
      const folderId = copyFolder({ projectId: own, folderId: open?.folderId ?? null }, destination);
      // A folder deleted elsewhere sends the import to the root.
      const { created: imported, atRoot } = await inFolderOrRoot(folderId, (folder) => {
        const input = {
          title: file.name.replace(/\.excalidraw$/i, '').slice(0, 300),
          projectId: destination.project.id,
          ...(folder ? { folderId: folder } : {}),
          scene,
        };
        return api.workspace.createCanvas({ ...input, requestId: importRequest.for(input) });
      });
      importRequest.clear();
      await refreshWorkspace();
      toast(
        destination.redirected
          ? redirectedCopyText(destination.project.name, projects.find((p) => p.id === own)?.name, 'Importado')
          : atRoot
            ? 'Arquivo importado como um novo desenho, na raiz do projeto: a pasta foi excluída.'
            : 'Arquivo importado como um novo desenho.',
      );
      void navigate({ href: paths.drawing(destination.project.id, imported.id) });
    } catch (error) {
      toast(error instanceof Error ? error.message : errorMessage(error), 'error');
    } finally {
      setImporting(false);
    }
  }

  function downloadRecovery() {
    const raw = controller.getState().recoveryData;
    if (!raw) return;
    downloadDraft(raw, 'drawing', canvasId);
    controller.recoveryDownloaded();
    toast(DRAFT_DOWNLOADED);
  }

  return { exportEditable, exportPNG, exporting, importDrawing, importing, downloadRecovery };
}
