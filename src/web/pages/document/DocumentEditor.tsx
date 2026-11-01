import { ArrowDownToLine, ArrowUpFromLine, ListTodo, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ReloadDialog, SaveBanners, SaveState, TrashItemDialog, useItemActions } from '../../components/editor';
import type { Snapshot } from '../../lib/autosave';
import { formatCount } from '../../lib/count';
import { moveThroughController } from '../../lib/editor-move';
import { useHasActiveProject, useTasks } from '../../lib/queries';
import { registerOpenEditor } from '../../lib/save-registry';
import { type Document, type DocumentContent, displayTitle, UNTITLED } from '../../lib/types';
import { useAutosaveLifecycle } from '../../lib/use-autosave-lifecycle';
import { usePageTitle } from '../../lib/use-page-title';
import { FolderLabel, ItemMenu, type ItemMenuAction, PageFrame, useApp, usePageCommands } from '../../shell';
import { useTheme } from '../../shell/theme';
import { Banner, Button, IconButton } from '../../ui';
import { DocumentContentEditor } from './DocumentContentEditor';
import { DocumentTitle } from './DocumentTitle';
import { documentController, documentItem } from './document-session';
import { LinkedTasksPanel } from './LinkedTasksPanel';
import { useBlockAnchor, useDocumentEditor } from './use-document-editor';
import { useDocumentFiles } from './use-document-files';
import { selectedText, useTaskFromSelection } from './use-task-from-selection';

/**
 * An open document: the page bar with the save state, the tasks born here and the ⋯; the bands; the title
 * and the content; and the tasks panel on the side.
 */
export function DocumentEditor({ document }: { document: Document }) {
  const app = useApp();
  const theme = useTheme();
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
  const tasks = useTasks({ documentId: document.id });
  const hasActiveProject = useHasActiveProject();
  const [tasksOpen, setTasksOpen] = useState(false);
  const [selection, setSelection] = useState('');
  const [trashOpen, setTrashOpen] = useState(false);
  const [reloadOpen, setReloadOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const files = useDocumentFiles(editor, controller, document.id);
  const taskFromSelection = useTaskFromSelection(editor, controller, document, () => setTasksOpen(true));
  const projectId = state.snapshot.projectId;
  const actions = useItemActions(controller, documentItem(document.id));
  const fileActions: ItemMenuAction[] = [
    {
      id: 'import',
      label: 'Importar Markdown',
      icon: <ArrowUpFromLine size={16} />,
      action: () => fileInput.current?.click(),
    },
    {
      id: 'export',
      label: 'Exportar Markdown',
      icon: <ArrowDownToLine size={16} />,
      action: () => void files.exportMarkdown(),
    },
  ];
  // ⌘S saves now and, after a failure, tries again; ⌘K lists the item's actions under "Neste item".
  usePageCommands({
    saveNow: () => void controller.flush(),
    files: fileActions.map(({ id, label, icon, action }) => ({ id, label, icon, run: action })),
    trash: () => setTrashOpen(true),
  });

  const update = (patch: Partial<Snapshot>) => controller.change({ ...controller.getState().snapshot, ...patch });
  const linked = tasks.data?.tasks ?? [];
  const openCount = linked.filter((task) => task.status !== 'done').length;
  const title = state.snapshot.title === UNTITLED ? '' : state.snapshot.title;

  return (
    <PageFrame
      lead={<FolderLabel projectId={projectId} folderId={document.folderId} />}
      actions={
        <>
          <SaveState status={state.status} />
          <Button
            variant="ghost"
            icon={<ListTodo size={16} />}
            aria-expanded={tasksOpen}
            aria-controls="linked-tasks-panel"
            onPress={() => setTasksOpen(!tasksOpen)}
          >
            Tarefas <span className="document-page__count">{formatCount(openCount)}</span>
          </Button>
          <ItemMenu
            type="document"
            id={document.id}
            projectId={projectId}
            folderId={document.folderId}
            pinned={Boolean(document.pinnedAt)}
            onTrash={() => setTrashOpen(true)}
            actions={fileActions}
          />
        </>
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
      <div className="document-page" data-tasks={tasksOpen || undefined}>
        <div className="document-page__main">
          <SaveBanners
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
          <article className="document">
            <h1 className="sr-only" tabIndex={-1}>
              {displayTitle(title)}
            </h1>
            <DocumentTitle
              value={title}
              onChange={(value) => update({ title: value })}
              onEnter={() => editor.focus()}
            />
            <hr className="document__hair" />
            <DocumentContentEditor
              editor={editor}
              theme={theme.resolved}
              onChange={() => update({ content: editor.document as unknown as DocumentContent })}
              onSelectionChange={() => setSelection(selectedText(editor))}
              onCreateTask={() => void taskFromSelection.create()}
            />
            <footer className="document__hint">
              <span>
                Digite <kbd className="kbd">/</kbd> para inserir um bloco
              </span>
              {selection && (
                <button
                  type="button"
                  className="document__task-button"
                  disabled={taskFromSelection.preparing}
                  // A mouse press keeps the focus, and so the selection, in the editor.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void taskFromSelection.create()}
                >
                  <Plus size={14} aria-hidden="true" />
                  {taskFromSelection.preparing ? 'Preparando…' : 'Criar tarefa da seleção'}
                </button>
              )}
            </footer>
          </article>
        </div>
        {tasksOpen && (
          <LinkedTasksPanel
            tasks={linked}
            pending={tasks.isPending}
            error={tasks.error}
            onClose={() => setTasksOpen(false)}
          />
        )}
      </div>
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
