import { ArrowDownToLine, ArrowUpFromLine, ListTodo, Plus } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { SaveState } from '../../components/editor';
import type { Snapshot } from '../../lib/autosave';
import { moveThroughController } from '../../lib/editor-move';
import { useProjects, useTasks } from '../../lib/queries';
import { registerOpenEditor } from '../../lib/save-registry';
import type { Document, DocumentContent } from '../../lib/types';
import { useAutosaveLifecycle } from '../../lib/use-autosave-lifecycle';
import { usePageTitle } from '../../lib/use-page-title';
import { ItemMenu, type ItemMenuAction, PageFrame, useApp, usePageCommands } from '../../shell';
import { useTheme } from '../../shell/theme';
import { AlertDialog, Button } from '../../ui';
import { DocumentBanners } from './DocumentBanners';
import { DocumentContentEditor } from './DocumentContentEditor';
import { DocumentTitle } from './DocumentTitle';
import { documentController } from './document-session';
import { LinkedTasksPanel } from './LinkedTasksPanel';
import { selectedText, useDocumentActions } from './use-document-actions';
import { useBlockAnchor, useDocumentEditor } from './use-document-editor';
import { useDocumentFiles } from './use-document-files';

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
  const hasActiveProject = (useProjects(true).data ?? []).some((project) => !project.archivedAt);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [selection, setSelection] = useState('');
  const [trashOpen, setTrashOpen] = useState(false);
  const [reloadOpen, setReloadOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const files = useDocumentFiles(editor, controller, document.id);
  const actions = useDocumentActions(editor, controller, document, () => setTasksOpen(true));
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
  const projectId = state.snapshot.projectId ?? document.projectId ?? '';
  const title = state.snapshot.title === 'Sem título' ? '' : state.snapshot.title;

  return (
    <PageFrame
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
            Tarefas <span className="document-page__count">{openCount}</span>
          </Button>
          <ItemMenu
            type="document"
            id={document.id}
            projectId={projectId}
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
          <DocumentBanners
            state={state}
            anchorMissing={anchor.missing}
            canCopy={hasActiveProject}
            copying={actions.copying}
            onDismissAnchor={anchor.dismiss}
            onDownloadRecovery={files.downloadRecovery}
            onReload={() => setReloadOpen(true)}
            onSaveCopy={() => void actions.saveCopy()}
            onRetry={() => void controller.flush()}
            onExport={() => void files.exportMarkdown()}
          />
          <article className="document">
            <h1 className="sr-only" tabIndex={-1}>
              {title || 'Sem título'}
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
              onCreateTask={() => void actions.createTaskFromSelection()}
            />
            <footer className="document__hint">
              <span>
                Digite <kbd className="kbd">/</kbd> para inserir um bloco
              </span>
              {selection && (
                <button
                  type="button"
                  className="document__task-button"
                  disabled={actions.preparingTask}
                  // A mouse press keeps the focus, and so the selection, in the editor.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void actions.createTaskFromSelection()}
                >
                  <Plus size={14} aria-hidden="true" />
                  {actions.preparingTask ? 'Preparando…' : 'Criar tarefa da seleção'}
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
      <AlertDialog
        open={trashOpen}
        title="Mover para a lixeira?"
        confirmLabel="Mover para a lixeira"
        cancelLabel="Manter documento"
        isPending={actions.trashing}
        onClose={() => setTrashOpen(false)}
        onConfirm={() => void actions.moveToTrash().then((moved) => moved && setTrashOpen(false))}
      >
        <p>Você pode restaurar este documento depois. As tarefas vinculadas continuam no quadro.</p>
      </AlertDialog>
      <AlertDialog
        open={reloadOpen}
        title="Carregar a versão salva?"
        confirmLabel="Carregar versão salva"
        cancelLabel="Voltar"
        destructive={false}
        onClose={() => setReloadOpen(false)}
        onConfirm={() => void actions.reloadRemote().then((loaded) => loaded && setReloadOpen(false))}
      >
        <p>
          Isso substitui o rascunho desta aba. Para guardar as duas versões, volte e escolha “Salvar meu rascunho como
          cópia”.
        </p>
      </AlertDialog>
    </PageFrame>
  );
}
