import { ArrowDownToLine, ArrowUpFromLine, X } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ReloadDialog, SaveBanners, TrashItemDialog, useItemActions } from '../../components/item-page';
import type { Snapshot } from '../../lib/autosave';
import { moveThroughController } from '../../lib/editor-move';
import { useHasActiveProject, useProject } from '../../lib/queries';
import { registerOpenEditor } from '../../lib/save-registry';
import { type Document, type DocumentContent, UNTITLED } from '../../lib/types';
import { useAutosaveLifecycle } from '../../lib/use-autosave-lifecycle';
import { usePageTitle } from '../../lib/use-page-title';
import { FolderLabel, PageFrame, useApp, usePageCommands, useTaskDrawer } from '../../shell';
import { useTheme } from '../../shell/theme';
import { Banner, IconButton, useToast } from '../../ui';
import { DocumentBody } from './DocumentBody';
import { DocumentHeader } from './DocumentHeader';
import { documentController, documentItem } from './document-session';
import { useBlockAnchor, useDocumentEditor } from './use-document-editor';
import { useDocumentFiles } from './use-document-files';
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
  useEffect(
    () => registerOpenEditor('document', document.id, { moveTo: (move) => moveThroughController(controller, move) }),
    [controller, document.id],
  );
  useAutosaveLifecycle(controller);
  const state = useSyncExternalStore(controller.subscribe, controller.getState);
  usePageTitle(state.snapshot.title);
  const editor = useDocumentEditor(controller, document, state);
  const anchor = useBlockAnchor(editor);
  const hasActiveProject = useHasActiveProject();
  const [selection, setSelection] = useState('');
  const [trashOpen, setTrashOpen] = useState(false);
  const [reloadOpen, setReloadOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const files = useDocumentFiles(editor, controller, document.id);
  const taskFromSelection = useTaskFromSelection(editor, controller, document);
  const projectId = state.snapshot.projectId;
  const archived = Boolean(useProject(projectId)?.archivedAt);
  const actions = useItemActions(controller, documentItem(document.id));

  /** "Criar tarefa" in the ⋯: from the selected excerpt, or else a new task in the document's project. */
  function createTask() {
    if (selectedText(editor)) return void taskFromSelection.create();
    if (archived) return toast('Projeto arquivado: desarquive para criar itens.', 'error');
    drawer.newTask(projectId);
  }
  // ⌘S saves now and, after a failure, tries again; ⌘⌥T creates a task from the excerpt selected in the
  // editor; ⌘K lists the item's actions under "Neste item".
  usePageCommands({
    saveNow: () => void controller.flush(),
    createTask: () => {
      if (editor.isFocused() && selectedText(editor)) void taskFromSelection.create();
      else toast(NO_EXCERPT);
    },
    files: [
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
        run: () => fileInput.current?.click(),
      },
    ],
    trash: () => setTrashOpen(true),
  });

  const update = (patch: Partial<Snapshot>) => controller.change({ ...controller.getState().snapshot, ...patch });
  const title = state.snapshot.title === UNTITLED ? '' : state.snapshot.title;

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
            onCreateTask: createTask,
            onExport: () => void files.exportMarkdown(),
            onImport: () => fileInput.current?.click(),
            onTrash: () => setTrashOpen(true),
          }}
        />
      }
      bands={
        <SaveBanners
          className="editor-banners editor-banners--column"
          state={state}
          noun="Este documento"
          projectId={projectId}
          canCopy={hasActiveProject}
          copying={actions.copying}
          onDownloadRecovery={files.downloadRecovery}
          onReload={() => setReloadOpen(true)}
          onSaveCopy={() => void actions.saveCopy()}
          onRetry={() => void controller.flush()}
          onExport={() => void files.exportMarkdown()}
        >
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
      <input
        ref={fileInput}
        type="file"
        accept=".md,.markdown,.txt,text/markdown,text/plain"
        className="sr-only"
        aria-label="Importar arquivo Markdown"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void files.importMarkdown(file);
        }}
      />
      <DocumentBody
        editor={editor}
        title={title}
        theme={theme.resolved}
        onTitleChange={(value) => update({ title: value })}
        onChange={() => update({ content: editor.document as unknown as DocumentContent })}
        onSelectionChange={() => setSelection(selectedText(editor))}
        onCreateTask={() => void taskFromSelection.create()}
      />
      <TrashItemDialog
        type="document"
        open={trashOpen}
        pending={actions.trashing}
        onClose={() => setTrashOpen(false)}
        onConfirm={() => void actions.moveToTrash().then((moved) => moved && setTrashOpen(false))}
      >
        As tarefas vinculadas continuam no quadro.
      </TrashItemDialog>
      <ReloadDialog
        open={reloadOpen}
        onClose={() => setReloadOpen(false)}
        onConfirm={() => void actions.reloadRemote().then((loaded) => loaded && setReloadOpen(false))}
      />
    </PageFrame>
  );
}
