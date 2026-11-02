import { ArrowDownToLine, ArrowUpFromLine, ListTodo, Plus, Shapes, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { HiddenFileInput, ItemEditorDialogs, SaveBanners, useItemEditor } from '../../components/item-page';
import { useProject } from '../../lib/queries';
import type { Document } from '../../lib/types';
import { FolderLabel, PageFrame, useApp, usePageCommands, useTaskDrawer } from '../../shell';
import { useTheme } from '../../shell/theme';
import { Banner, IconButton, useToast } from '../../ui';
import { DocumentBody } from './DocumentBody';
import { DocumentEmbeds, type EmbedCommands } from './DocumentEmbeds';
import { DocumentHeader } from './DocumentHeader';
import { ARCHIVED_NOTE } from './DocumentMenu';
import { documentController, documentItem } from './document-session';
import { savedContent, useBlockAnchor, useDocumentEditor } from './use-document-editor';
import { useDocumentFiles } from './use-document-files';
import { useNewDocument } from './use-new-document';
import { useOriginMarkers } from './use-origin-markers';
import { NO_EXCERPT, selectedText, useTaskFromSelection } from './use-task-from-selection';

/**
 * An open document: the page bar with its folder, the save state, "Tarefas · n" and the ⋯; the bands, which
 * stay in view; and the column with the title and the content.
 */
export function DocumentEditor({ document }: { document: Document }) {
  const app = useApp();
  const theme = useTheme();
  const toast = useToast();
  const drawer = useTaskDrawer();
  const [controller] = useState(() => documentController(document, app.owner.installationId));
  const embedCommands = useRef<EmbedCommands | null>(null);
  const page = useItemEditor({
    controller,
    item: documentItem(document.id),
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

  /**
   * "Criar tarefa" in the ⋯: from the selected excerpt, or else a new task in the document's project; none in
   * an archived project, with or without an excerpt (review M4).
   */
  function createTask() {
    if (archived) return toast(ARCHIVED_NOTE, 'error');
    if (selectedText(editor)) return void taskFromSelection.create();
    drawer.newTask(projectId);
  }
  // ⌘S saves now and, after a failure, tries again; ⌘⌥T creates a task from the excerpt selected in the
  // editor; ⌘K lists the item's actions under "Neste item".
  usePageCommands({
    saveNow: () => void controller.flush(),
    createTask: () => {
      if (archived) toast(ARCHIVED_NOTE, 'error');
      else if (editor.isFocused() && selectedText(editor)) void taskFromSelection.create();
      else toast(NO_EXCERPT);
    },
    files: [
      // ⌘K's "Neste item" (docs/etapas/11-documento-desenho.md, W4): the excerpt's task and the embeds, which
      // a document of an archived project does not offer.
      ...(archived
        ? []
        : [
            {
              id: 'create-task',
              label: 'Criar tarefa da seleção',
              icon: <Plus size={16} />,
              run: () => {
                if (selectedText(editor)) void taskFromSelection.create();
                else toast(NO_EXCERPT);
              },
            },
            {
              id: 'embed-task',
              label: 'Incorporar tarefa…',
              icon: <ListTodo size={16} />,
              run: () => embedCommands.current?.openPicker('task'),
            },
            {
              id: 'embed-drawing',
              label: 'Incorporar desenho…',
              icon: <Shapes size={16} />,
              run: () => embedCommands.current?.openPicker('drawing'),
            },
          ]),
      {
        id: 'export',
        label: 'Exportar Markdown',
        icon: <ArrowDownToLine size={16} />,
        run: () => void files.exportMarkdown(),
      },
      {
        id: 'import',
        label: 'Importar Markdown',
        icon: <ArrowUpFromLine size={16} />,
        run: page.openImport,
      },
    ],
    trash: page.openTrash,
  });

  return (
    <PageFrame
      lead={<FolderLabel projectId={projectId} folderId={document.folderId} />}
      actions={
        <DocumentHeader
          status={state.status}
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
