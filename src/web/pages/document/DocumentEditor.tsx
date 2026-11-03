import { X } from 'lucide-react';
import { useRef, useState, useSyncExternalStore } from 'react';
import {
  HiddenFileInput,
  ItemEditorDialogs,
  onlyTrashNotice,
  SaveBanners,
  TrashedItem,
  useItemEditor,
} from '../../components/item-page';
import { useProject } from '../../lib/queries';
import type { Document } from '../../lib/types';
import { FolderLabel, PageFrame, useApp } from '../../shell';
import { useTheme } from '../../shell/theme';
import { Banner, IconButton } from '../../ui';
import { DocumentBody } from './DocumentBody';
import { DocumentEmbeds, type EmbedCommands } from './DocumentEmbeds';
import { DocumentHeader } from './DocumentHeader';
import { documentController, documentItem } from './document-session';
import { useDocumentCommands } from './use-document-commands';
import { savedContent, useBlockAnchor, useDocumentEditor } from './use-document-editor';
import { useDocumentFiles } from './use-document-files';
import { useNewDocument } from './use-new-document';
import { useOriginMarkers } from './use-origin-markers';
import { selectedText, useTaskFromSelection } from './use-task-from-selection';

/**
 * An open document, or, in the trash with nothing local to keep, the way to the trash. The session reads what
 * this device keeps of the document, so it decides; only the editor's page registers its commands, its tab
 * title and the editor.
 */
export function DocumentEditor({ document }: { document: Document }) {
  const app = useApp();
  const [controller] = useState(() => documentController(document, app.owner.installationId));
  const state = useSyncExternalStore(controller.subscribe, controller.getState);
  // In the trash with nothing local to keep, the page only leads to the trash; with local text, the editor stays
  // with the trashed band and the copy, as the drawing's (decision 1).
  if (onlyTrashNotice(document.deletedAt, state))
    return (
      <PageFrame>
        <TrashedItem
          title="Este documento está na lixeira"
          description="Você pode restaurá-lo para continuar escrevendo."
          projectId={document.projectId}
        />
      </PageFrame>
    );
  return <OpenDocument document={document} controller={controller} />;
}

/**
 * The document's editor: the page bar with its folder, the save state, "Tarefas · n" and the ⋯; the bands, which
 * stay in view; and the column with the title and the content.
 */
function OpenDocument({
  document,
  controller,
}: {
  document: Document;
  controller: ReturnType<typeof documentController>;
}) {
  const theme = useTheme();
  const embedCommands = useRef<EmbedCommands | null>(null);
  const page = useItemEditor({
    controller,
    item: documentItem(document.id),
    trashed: Boolean(document.deletedAt),
    openEditor: {
      insertEmbedAfter: (blockId, taskId) => embedCommands.current?.insertTaskAfter(blockId, taskId) ?? false,
    },
  });
  const { state, fileInput } = page;
  const openOrigin = useRef<(taskId: string) => void>(() => undefined);
  const editor = useDocumentEditor(controller, document, state, openOrigin, embedCommands);
  useOriginMarkers(editor, document.id, openOrigin);
  const anchor = useBlockAnchor(editor);
  const [selection, setSelection] = useState('');
  const files = useDocumentFiles(editor, controller, document.id);
  const taskFromSelection = useTaskFromSelection(editor, controller, document);
  const projectId = state.snapshot.projectId;
  const archived = Boolean(useProject(projectId)?.archivedAt);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  useNewDocument(document.id, editor, titleRef);

  const { createTask } = useDocumentCommands({
    editor,
    controller,
    archived,
    projectId,
    taskFromSelection,
    embedCommands,
    files,
    page,
  });

  return (
    <PageFrame
      lead={<FolderLabel projectId={projectId} folderId={document.folderId} />}
      actions={
        <DocumentHeader
          status={state.status}
          trashed={Boolean(document.deletedAt)}
          updatedAt={document.updatedAt}
          onRetry={() => void controller.flush()}
          menu={{
            document,
            projectId,
            selected: Boolean(selection),
            preparing: taskFromSelection.preparing,
            archived,
            onCreateTask: createTask,
            onExport: () => void files.exportMarkdown(),
            onImport: page.openImport,
            onTrash: page.openTrash,
          }}
        />
      }
      bands={
        <SaveBanners
          {...page.banners}
          className="editor-banners editor-banners--column"
          noun="Este documento"
          trashed={Boolean(document.deletedAt)}
          projectId={projectId}
          onDownloadRecovery={files.downloadRecovery}
          onExport={() => void files.exportMarkdown()}
        >
          {archived && <Banner tone="info">Projeto arquivado: desarquive para editar o documento.</Banner>}
          {anchor.missing && (
            <Banner
              tone="info"
              actions={
                <IconButton label="Fechar aviso" size="sm" onPress={anchor.dismiss}>
                  <X size={14} />
                </IconButton>
              }
            >
              O trecho de origem mudou. Você está no documento original.
            </Banner>
          )}
        </SaveBanners>
      }
    >
      {/* "Importar Markdown" in the ⋯ and in ⌘K opens it; out of the Tab order, it has nothing to show (review B11). */}
      <HiddenFileInput
        inputRef={fileInput}
        accept=".md,.markdown,.txt,text/markdown,text/plain"
        label="Importar arquivo Markdown"
        onFile={(file) => void files.importMarkdown(file)}
      />
      <DocumentEmbeds
        editor={editor}
        documentId={document.id}
        projectId={projectId}
        folderId={document.folderId}
        readOnly={archived}
        commands={embedCommands}
      >
        {(slashItems) => (
          <DocumentBody
            editor={editor}
            title={page.title}
            titleRef={titleRef}
            theme={theme.resolved}
            onTitleChange={(value) => page.change({ title: value })}
            onChange={() => page.change({ content: savedContent(editor) })}
            onSelectionChange={() => setSelection(selectedText(editor))}
            onCreateTask={() => void taskFromSelection.create()}
            slashItems={slashItems}
            readOnly={archived}
          />
        )}
      </DocumentEmbeds>
      <ItemEditorDialogs {...page.dialogs} trashNote="As tarefas vinculadas continuam no quadro." />
    </PageFrame>
  );
}
