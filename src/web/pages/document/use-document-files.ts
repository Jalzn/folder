import type { BlockNoteEditor } from '@blocknote/core';
import { useNavigate } from '@tanstack/react-router';
import { api, errorMessage, refreshWorkspace } from '../../lib/api';
import type { AutosaveController } from '../../lib/autosave';
import { downloadFile, fileNameFrom } from '../../lib/download';
import { exportMarkdownWithMath, importMarkdownWithMath } from '../../lib/markdown';
import type { DocumentContent } from '../../lib/types';
import { useRequest } from '../../lib/use-request';
import { paths } from '../../router/paths';
import { redirectedCopyText, useCopyDestination } from '../../shell';
import { useToast } from '../../ui';
import type { EditorBlocks } from './document-schema';

const MAX_IMPORT_BYTES = 1_048_576;

/**
 * The document's files: export to Markdown, import a Markdown file as a new document, and download a draft
 * that could not open. An import goes to the document's project, or elsewhere while that one is archived.
 */
export function useDocumentFiles(
  // biome-ignore lint/suspicious/noExplicitAny: BlockNote's editor type depends on the schema's generics.
  editor: BlockNoteEditor<any, any, any>,
  controller: AutosaveController,
  documentId: string,
) {
  const toast = useToast();
  const navigate = useNavigate();
  const importRequest = useRequest();
  const findDestination = useCopyDestination();

  async function exportMarkdown() {
    try {
      const markdown = await exportMarkdownWithMath(editor.document as unknown as DocumentContent, (blocks) =>
        editor.blocksToMarkdownLossy(blocks as unknown as EditorBlocks),
      );
      const title = controller.getState().snapshot.title;
      downloadFile(
        new Blob([`# ${title || 'Sem título'}\n\n${markdown}`], { type: 'text/markdown;charset=utf-8' }),
        fileNameFrom(title, 'documento', 'md'),
      );
      toast('Documento exportado em Markdown.');
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  }

  async function importMarkdown(file: File) {
    if (file.size > MAX_IMPORT_BYTES) {
      toast('Escolha um arquivo Markdown de até 1 MB.', 'error');
      return;
    }
    try {
      const own = controller.getState().snapshot.projectId;
      const { destination, projects } = await findDestination(own);
      if (!destination) {
        toast('Crie ou desarquive um projeto antes de importar.', 'error');
        return;
      }
      const blocks = await importMarkdownWithMath(
        await file.text(),
        async (source) => (await editor.tryParseMarkdownToBlocks(source)) as unknown as DocumentContent,
      );
      // Import into a fresh document: the open draft remains untouched.
      const input = {
        title: file.name.replace(/\.(md|markdown|txt)$/i, '').slice(0, 300),
        projectId: destination.project.id,
        content: blocks as unknown as DocumentContent,
      };
      const imported = await api.workspace.createDocument({ ...input, requestId: importRequest.for(input) });
      importRequest.clear();
      await refreshWorkspace();
      toast(
        destination.redirected
          ? redirectedCopyText(destination.project.name, projects.find((p) => p.id === own)?.name, 'Importado')
          : 'Markdown importado como um novo documento.',
      );
      void navigate({ href: paths.document(destination.project.id, imported.id) });
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  }

  function downloadRecovery() {
    const raw = controller.getState().recoveryData;
    if (!raw) return;
    downloadFile(new Blob([raw], { type: 'application/json' }), `tinyfold-rascunho-${documentId}.json`);
    controller.recoveryDownloaded();
    toast('Uma cópia do rascunho foi baixada.');
  }

  return { exportMarkdown, importMarkdown, downloadRecovery };
}
