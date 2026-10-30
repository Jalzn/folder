import {
  BlockNoteSchema,
  type BlockSpec,
  combineByGroup,
  createHeadingBlockSpec,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  type PartialBlock,
} from '@blocknote/core';
import { filterSuggestionItems } from '@blocknote/core/extensions';
import { pt } from '@blocknote/core/locales';
import { BlockNoteView } from '@blocknote/mantine';
import {
  createReactMathBlockSpec,
  getMathBlockTypeSelectItems,
  getMathSlashMenuItems,
  MathInlineInputRulesExtension,
  locales as mathLocales,
} from '@blocknote/math-block';
import {
  blockTypeSelectItems,
  FormattingToolbar,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  SuggestionMenuController,
  useComponentsContext,
  useCreateBlockNote,
} from '@blocknote/react';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  Check,
  ChevronDown,
  CloudCheck,
  FileText,
  Folder,
  ListTodo,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createInlineMathSpec } from '../components/InlineMath';
import { api, errorCode, errorMessage, queryClient, refreshWorkspace, reportSessionError } from '../lib/api';
import { AutosaveController, type Snapshot } from '../lib/autosave';
import { exportMarkdownWithMath, importMarkdownWithMath } from '../lib/markdown';
import { useDocument, useProjects, useTasks } from '../lib/queries';
import type { Document, DocumentContent } from '../lib/types';
import { useApp } from '../shell';
import { Dialog, EmptyState, ErrorNotice, Menu, Spinner, useAction, useRequest, useToast } from '../ui';
import { LinkedTask, TaskDialog, type TaskOrigin } from './Board';

const schema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: defaultBlockSpecs.paragraph,
    // BlockNote 0.56 declares an optional property even with toggle headings disabled.
    heading: createHeadingBlockSpec({ levels: [1, 2, 3], allowToggleHeadings: false }) as unknown as BlockSpec<
      'heading',
      Omit<typeof defaultBlockSpecs.heading.config.propSchema, 'isToggleable'>,
      'inline'
    >,
    bulletListItem: defaultBlockSpecs.bulletListItem,
    numberedListItem: defaultBlockSpecs.numberedListItem,
    checkListItem: defaultBlockSpecs.checkListItem,
    quote: defaultBlockSpecs.quote,
    codeBlock: defaultBlockSpecs.codeBlock,
    mathBlock: createReactMathBlockSpec(),
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    math: createInlineMathSpec(),
  },
});
type EditorBlocks = PartialBlock<typeof schema.blockSchema, typeof schema.inlineContentSchema>[];
const controllers = new Map<string, AutosaveController>();
function snapshot(document: Document): Snapshot {
  return { title: document.title, projectId: document.projectId, content: document.content };
}
function controllerFor(document: Document, installationId: string) {
  const identity = `${installationId}:${document.id}`;
  let controller = controllers.get(identity);
  if (!controller) {
    // A duplicated browser tab inherits sessionStorage. Each mounted page therefore writes
    // to its own fresh record and only uses the inherited pointer for recovery.
    const key = `tinyfold:draft:${identity}:${crypto.randomUUID()}`;
    const pointerKey = `tinyfold:draft-pointer:${identity}`;
    let previousKey: string | null = null;
    try {
      previousKey = sessionStorage.getItem(pointerKey);
    } catch {
      /* Local storage may still preserve this page's draft. */
    }
    controller = new AutosaveController({
      id: document.id,
      snapshot: snapshot(document),
      version: document.version,
      storage: {
        read: () => {
          const value = localStorage.getItem(key) ?? (previousKey ? localStorage.getItem(previousKey) : null);
          if (value !== null) {
            // Copy before replacing the pointer, including drafts that cannot be rendered.
            try {
              localStorage.setItem(key, value);
              sessionStorage.setItem(pointerKey, key);
            } catch {
              /* Keep the predecessor pointer if storage is full. */
            }
          }
          return value;
        },
        write: (value) => {
          localStorage.setItem(key, value);
          sessionStorage.setItem(pointerKey, key);
        },
        remove: () => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(pointerKey);
        },
      },
      idFactory: () => crypto.randomUUID(),
      classifyError: errorCode,
      send: async (input) => {
        if (new TextEncoder().encode(JSON.stringify(input.content)).length > 1_048_576)
          throw Object.assign(
            new Error(
              'Este documento ultrapassou o limite de 1 MB. Exporte uma cópia e divida o conteúdo em mais documentos.',
            ),
            { code: 'VALIDATION' },
          );
        try {
          return await api.workspace.saveDocument(input);
        } catch (error) {
          reportSessionError(error);
          throw error;
        }
      },
      onSaved: (ack, sent) => {
        queryClient.setQueryData<Document>(['workspace', 'document', document.id], (previous) =>
          previous && previous.version > ack.version
            ? previous
            : {
                ...(previous ?? document),
                ...sent,
                title: sent.title.trim() || 'Sem título',
                version: ack.version,
                updatedAt: ack.updatedAt,
              },
        );
        void queryClient.invalidateQueries({ queryKey: ['workspace', 'documents'] });
        void queryClient.invalidateQueries({ queryKey: ['workspace', 'tasks'] });
      },
    });
    controllers.set(identity, controller);
  }
  return controller;
}

export function DocumentPage() {
  const { documentId } = useParams({ from: '/documentos/$documentId' });
  const document = useDocument(documentId);
  if (document.isPending)
    return (
      <div className="page">
        <Spinner label="Abrindo documento…" />
      </div>
    );
  if (document.error)
    return (
      <div className="page">
        <Link to="/documentos" className="text-button">
          <ArrowLeft size={16} />
          Documentos
        </Link>
        <ErrorNotice error={document.error} retry={() => void document.refetch()} />
      </div>
    );
  if (!document.data) return null;
  if (document.data.deletedAt)
    return (
      <div className="page">
        <EmptyState
          icon={<Trash2 size={30} />}
          title="Este documento está na lixeira"
          description="Você pode restaurá-lo para continuar escrevendo."
        >
          <Link to="/lixeira" className="button primary">
            Abrir lixeira
          </Link>
        </EmptyState>
      </div>
    );
  return <DocumentEditor key={documentId} document={document.data} />;
}

function SelectionButton({ create }: { create: () => void }) {
  const components = useComponentsContext();
  if (!components) return null;
  return (
    <components.FormattingToolbar.Button
      mainTooltip="Criar tarefa a partir da seleção"
      label="Criar tarefa"
      icon={<Plus size={15} />}
      onClick={create}
    >
      Criar tarefa
    </components.FormattingToolbar.Button>
  );
}

function DocumentTitle({
  value,
  onChange,
  onEnter,
}: {
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
}) {
  const elementRef = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element || element.value !== value) return;
    const fit = () => {
      element.style.height = 'auto';
      element.style.height = `${element.scrollHeight}px`;
    };
    fit();
    let width = element.getBoundingClientRect().width;
    const observer = new ResizeObserver(() => {
      const nextWidth = element.getBoundingClientRect().width;
      if (nextWidth !== width) {
        width = nextWidth;
        fit();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [value]);
  return (
    <textarea
      ref={elementRef}
      className="document-title"
      aria-label="Título do documento"
      value={value}
      rows={1}
      wrap="soft"
      maxLength={300}
      placeholder="Sem título"
      onChange={(event) => onChange(event.target.value.replace(/[\r\n]+/g, ' '))}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
          event.preventDefault();
          onEnter();
        }
      }}
    />
  );
}

function DocumentEditor({ document }: { document: Document }) {
  const app = useApp();
  const [controller] = useState(() => controllerFor(document, app.owner.installationId));
  const state = useSyncExternalStore(controller.subscribe, controller.getState);
  const projects = useProjects(true);
  const tasks = useTasks({ documentId: document.id });
  const [tasksOpen, setTasksOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [origin, setOrigin] = useState<TaskOrigin | null>(null);
  const [selection, setSelection] = useState('');
  const [creatingFromSelection, setCreatingFromSelection] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reloadOpen, setReloadOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const [completeVisible, setCompleteVisible] = useState(false);
  const [anchorMissing, setAnchorMissing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const action = useAction();
  const request = useRequest();
  const copyRequest = useRequest();
  const importRequest = useRequest();
  const toast = useToast();
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const initial = useRef(state.snapshot.content);
  const editor = useCreateBlockNote({
    schema,
    // BlockNote 0.56 registers block-spec extensions, but not inline-spec extensions.
    extensions: [MathInlineInputRulesExtension],
    dictionary: {
      ...pt,
      math: {
        ...mathLocales.pt,
        block: { ...mathLocales.pt.block, input_placeholder: 'Equação em LaTeX, exemplo: E = mc^2' },
        inline: { ...mathLocales.pt.inline, input_placeholder: 'Equação em LaTeX, exemplo: E = mc^2' },
        slash_menu: {
          math_block: {
            ...mathLocales.pt.slash_menu.math_block,
            title: 'Equação',
            aliases: ['equacao', 'equação', 'formula', 'fórmula', 'latex', 'math', 'equation'],
          },
          inline_math: {
            ...mathLocales.pt.slash_menu.inline_math,
            aliases: ['equacao', 'equação', 'formula', 'fórmula', 'latex', 'math', 'inline'],
          },
        },
      },
      placeholders: {
        ...pt.placeholders,
        default: 'Escreva uma ideia ou digite / para explorar…',
        emptyDocument: 'Escreva uma ideia ou digite / para explorar…',
      },
    },
    ...(initial.current.length ? { initialContent: initial.current as unknown as EditorBlocks } : {}),
    domAttributes: { editor: { 'aria-label': 'Conteúdo do documento', 'data-testid': 'document-content' } },
  });
  const lastEpoch = useRef(state.remoteEpoch);
  useEffect(() => {
    controller.receiveRemote(snapshot(document), document.version);
  }, [controller, document]);
  useEffect(() => {
    if (lastEpoch.current !== state.remoteEpoch) {
      lastEpoch.current = state.remoteEpoch;
      editor.replaceBlocks(
        editor.document,
        state.snapshot.content.length ? (state.snapshot.content as unknown as EditorBlocks) : [{ type: 'paragraph' }],
      );
    }
  }, [editor, state.remoteEpoch, state.snapshot.content]);
  useEffect(() => {
    const retry = () => {
      if (controller.getState().status === 'error') void controller.flush();
    };
    const beforeLeave = (event: BeforeUnloadEvent) => {
      if (controller.getState().status !== 'saved') {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const hidden = () => {
      if (
        globalThis.document.visibilityState === 'hidden' &&
        !['error', 'conflict'].includes(controller.getState().status)
      )
        void controller.flush();
    };
    window.addEventListener('online', retry);
    window.addEventListener('beforeunload', beforeLeave);
    globalThis.document.addEventListener('visibilitychange', hidden);
    if (controller.getState().recovered && controller.getState().status !== 'conflict') void controller.flush();
    return () => {
      window.removeEventListener('online', retry);
      window.removeEventListener('beforeunload', beforeLeave);
      globalThis.document.removeEventListener('visibilitychange', hidden);
      if (!['saved', 'error', 'conflict'].includes(controller.getState().status)) void controller.flush();
    };
  }, [controller]);
  useEffect(() => {
    if (!search.bloco) return;
    try {
      const block = editor.getBlock(search.bloco);
      if (!block) {
        setAnchorMissing(true);
        return;
      }
      editor.setTextCursorPosition(block.id, 'start');
      editor.focus();
      setAnchorMissing(false);
    } catch {
      setAnchorMissing(true);
    }
  }, [editor, search.bloco]);
  useEffect(() => {
    globalThis.document.title = `${state.snapshot.title || 'Sem título'} · Tinyfold`;
    return () => {
      globalThis.document.title = 'Tinyfold';
    };
  }, [state.snapshot.title]);

  function update(patch: Partial<Snapshot>) {
    controller.change({ ...controller.getState().snapshot, ...patch });
  }
  function selectedText() {
    const { doc, selection } = editor.prosemirrorState;
    return doc.textBetween(selection.from, selection.to, '\n').trim();
  }
  async function createFromSelection() {
    const text = selectedText();
    if (!text) {
      toast('Selecione um trecho do documento para criar uma tarefa.', 'error');
      return;
    }
    const selectedBlocks = editor.getSelection()?.blocks;
    const blockId =
      selectedBlocks && selectedBlocks.length > 1
        ? null
        : (selectedBlocks?.[0]?.id ?? editor.getTextCursorPosition().block.id);
    setCreatingFromSelection(true);
    const saved = await controller.flush();
    setCreatingFromSelection(false);
    if (!saved || controller.getState().status !== 'saved') {
      toast('Salve ou resolva o conflito do documento antes de criar a tarefa.', 'error');
      return;
    }
    setOrigin({
      documentId: document.id,
      blockId,
      excerpt: text.slice(0, 4000),
      expectedVersion: controller.getState().version,
    });
  }
  async function reloadRemote() {
    try {
      const current = await api.workspace.getDocument({ id: document.id });
      controller.acceptRemote(snapshot(current), current.version);
      queryClient.setQueryData(['workspace', 'document', document.id], current);
      setReloadOpen(false);
      toast('Versão salva carregada.');
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  }
  async function saveCopy() {
    if (copying) return;
    setCopying(true);
    const current = controller.getState().snapshot;
    const input = { ...current, title: `${current.title || 'Sem título'} — cópia`.slice(0, 300) };
    try {
      const copy = await api.workspace.createDocument({ ...input, requestId: copyRequest.for(input) });
      copyRequest.clear();
      // The copy is already safe, even if the original was trashed on another device.
      try {
        const original = await api.workspace.getDocument({ id: document.id });
        controller.acceptRemote(snapshot(original), original.version);
      } catch {
        /* Keep the local draft; opening the acknowledged copy must still succeed. */
      }
      await refreshWorkspace();
      toast('Seu rascunho foi salvo em um novo documento.');
      void navigate({ to: '/documentos/$documentId', params: { documentId: copy.id } });
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setCopying(false);
    }
  }
  async function exportMarkdown() {
    try {
      const markdown = await exportMarkdownWithMath(editor.document as unknown as DocumentContent, (blocks) =>
        editor.blocksToMarkdownLossy(blocks as unknown as EditorBlocks),
      );
      const blob = new Blob([`# ${controller.getState().snapshot.title || 'Sem título'}\n\n${markdown}`], {
        type: 'text/markdown;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const anchor = globalThis.document.createElement('a');
      anchor.href = url;
      anchor.download = `${Array.from(state.snapshot.title || 'documento')
        .map((character) => (character.charCodeAt(0) < 32 ? '-' : character))
        .join('')
        .replace(/[<>:"/\\|?*]/g, '-')
        .slice(0, 100)}.md`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('Documento exportado em Markdown.');
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  }
  function exportRecoveryData() {
    if (!state.recoveryData) return;
    const url = URL.createObjectURL(new Blob([state.recoveryData], { type: 'application/json' }));
    const anchor = globalThis.document.createElement('a');
    anchor.href = url;
    anchor.download = `tinyfold-rascunho-${document.id}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    controller.recoveryDownloaded();
    toast('Uma cópia do rascunho foi baixada.');
  }
  async function importMarkdown(file: File) {
    if (file.size > 1_048_576) {
      toast('Escolha um arquivo Markdown de até 1 MB.', 'error');
      return;
    }
    try {
      const content = await file.text();
      const blocks = await importMarkdownWithMath(
        content,
        async (source) => (await editor.tryParseMarkdownToBlocks(source)) as unknown as DocumentContent,
      );
      // Import into a fresh document: the open draft remains untouched.
      const input = {
        title: file.name.replace(/\.(md|markdown|txt)$/i, '').slice(0, 300),
        projectId: state.snapshot.projectId,
        content: blocks as unknown as DocumentContent,
      };
      const imported = await api.workspace.createDocument({ ...input, requestId: importRequest.for(input) });
      importRequest.clear();
      await refreshWorkspace();
      toast('Markdown importado como um novo documento.');
      void navigate({ to: '/documentos/$documentId', params: { documentId: imported.id } });
    } catch (error) {
      toast(errorMessage(error), 'error');
    }
  }
  async function remove() {
    if (!(await controller.flush())) {
      toast('Resolva o salvamento antes de mover o documento para a lixeira.', 'error');
      return;
    }
    const input = { id: document.id, expectedVersion: controller.getState().version };
    await action.run(
      () => api.workspace.deleteDocument({ ...input, requestId: request.for(input) }),
      () => {
        request.clear();
        setDeleteOpen(false);
        toast('Documento movido para a lixeira.');
        void navigate({ to: '/documentos' });
      },
    );
  }
  const linked = tasks.data?.tasks ?? [];
  const openTasks = linked.filter((task) => task.status !== 'done');
  const doneTasks = linked.filter((task) => task.status === 'done');
  const selectedTask = linked.find((task) => task.id === selectedTaskId);
  const project = projects.data?.find((p) => p.id === state.snapshot.projectId);
  const statusText = {
    saved: 'Salvo',
    dirty: 'Salvando…',
    saving: 'Salvando…',
    error: 'Não salvo',
    conflict: 'Conflito de edição',
  }[state.status];
  return (
    <div className="document-page">
      <header className="editor-topbar">
        <div className="breadcrumb">
          <Link to="/documentos">
            <FileText size={15} />
            <span>Documentos</span>
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
          <button
            type="button"
            className={`button subtle tasks-toggle ${tasksOpen ? 'selected' : ''}`}
            onClick={() => setTasksOpen(!tasksOpen)}
            aria-expanded={tasksOpen}
            aria-controls="linked-tasks-panel"
          >
            <ListTodo size={17} />
            <span>Tarefas</span>
            <span className="count-badge">{openTasks.length}</span>
          </button>
          <Menu
            label="Opções do documento"
            trigger={<MoreHorizontal size={20} />}
            items={[
              {
                label: 'Importar Markdown',
                icon: <ArrowUpFromLine size={16} />,
                action: () => fileInput.current?.click(),
              },
              { label: 'Exportar Markdown', icon: <ArrowDownToLine size={16} />, action: () => void exportMarkdown() },
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
        accept=".md,.markdown,.txt,text/markdown,text/plain"
        className="sr-only"
        aria-label="Importar arquivo Markdown"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void importMarkdown(file);
        }}
      />
      {state.recoveryData && (
        <div className="editor-alert" role="alert">
          <AlertCircle size={18} />
          <div>
            <strong>Encontramos um rascunho que não pôde ser aberto.</strong>
            <span>Você está vendo a versão salva. Baixe o rascunho original para preservar seu conteúdo.</span>
          </div>
          <button type="button" className="button secondary" onClick={exportRecoveryData}>
            <ArrowDownToLine size={15} />
            Baixar rascunho original
          </button>
        </div>
      )}
      {state.status === 'conflict' && (
        <div className="editor-alert" role="alert">
          <AlertCircle size={18} />
          <div>
            <strong>Este documento mudou em outro dispositivo.</strong>
            <span>Seu rascunho está preservado. Escolha como continuar.</span>
          </div>
          <button type="button" className="button secondary" onClick={() => setReloadOpen(true)}>
            Carregar versão salva
          </button>
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
          <button type="button" className="text-button" onClick={() => void exportMarkdown()}>
            Exportar cópia
          </button>
        </div>
      )}
      {state.storageFailed && state.status !== 'saved' && (
        <div className="editor-alert" role="alert">
          <AlertCircle size={17} />
          <span>
            O navegador não conseguiu guardar o rascunho local. Mantenha esta aba aberta até aparecer “Salvo” ou exporte
            uma cópia.
          </span>
        </div>
      )}
      {anchorMissing && (
        <div className="editor-alert">
          <FileText size={17} />
          <span>O trecho de origem mudou. Você está no documento original.</span>
          <button
            type="button"
            className="icon-button"
            aria-label="Fechar aviso"
            onClick={() => setAnchorMissing(false)}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div className={`editor-layout ${tasksOpen ? 'with-tasks' : ''}`}>
        <article className="writing-area">
          <div className="writing-meta">
            <label className="project-picker">
              <Folder size={14} />
              <span className="sr-only">Projeto do documento</span>
              <select
                aria-label="Projeto do documento"
                value={state.snapshot.projectId ?? ''}
                onChange={(event) => update({ projectId: event.target.value || null })}
              >
                <option value="">Sem projeto</option>
                {projects.data?.map((p) => (
                  <option key={p.id} value={p.id} disabled={Boolean(p.archivedAt) && p.id !== state.snapshot.projectId}>
                    {p.name}
                    {p.archivedAt ? ' (arquivado)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} />
            </label>
            <span className="writing-meta-dot">·</span>
            <span>Documento</span>
            {project?.archivedAt && <span className="archived-label">Projeto arquivado</span>}
          </div>
          <DocumentTitle
            value={state.snapshot.title === 'Sem título' ? '' : state.snapshot.title}
            onChange={(title) => update({ title })}
            onEnter={() => editor.focus()}
          />
          <div className="document-editor">
            <BlockNoteView
              editor={editor}
              theme="dark"
              formattingToolbar={false}
              slashMenu={false}
              onChange={() => update({ content: editor.document as unknown as DocumentContent })}
              onSelectionChange={() => setSelection(selectedText())}
            >
              <FormattingToolbarController
                formattingToolbar={() => (
                  <FormattingToolbar>
                    {getFormattingToolbarItems([
                      ...blockTypeSelectItems(editor),
                      ...getMathBlockTypeSelectItems(editor),
                    ])}
                    <SelectionButton create={() => void createFromSelection()} />
                  </FormattingToolbar>
                )}
              />
              <SuggestionMenuController
                triggerCharacter="/"
                getItems={async (query) =>
                  filterSuggestionItems(
                    combineByGroup(getDefaultReactSlashMenuItems(editor), getMathSlashMenuItems(editor)),
                    query,
                  )
                }
              />
            </BlockNoteView>
          </div>
          <div className="editor-bottom-hint">
            <span>
              Digite <kbd>/</kbd> para inserir um bloco
            </span>
            {selection && (
              <button
                type="button"
                className="text-button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void createFromSelection()}
                disabled={creatingFromSelection}
              >
                <Plus size={14} />
                {creatingFromSelection ? 'Preparando…' : 'Criar tarefa da seleção'}
              </button>
            )}
          </div>
        </article>
        {tasksOpen && (
          <aside id="linked-tasks-panel" className="linked-tasks-panel">
            <div className="section-heading">
              <h2>
                <ListTodo size={17} />
                Neste documento
              </h2>
              <button
                type="button"
                className="icon-button"
                aria-label="Recolher tarefas"
                onClick={() => setTasksOpen(false)}
              >
                <X size={17} />
              </button>
            </div>
            <p className="muted small">Próximos passos que nasceram daqui.</p>
            {tasks.isPending ? (
              <Spinner />
            ) : tasks.error ? (
              <ErrorNotice error={tasks.error} />
            ) : openTasks.length ? (
              openTasks.map((task) => (
                <LinkedTask key={task.id} task={task} onOpen={() => setSelectedTaskId(task.id)} />
              ))
            ) : (
              <div className="linked-empty">
                <Check size={21} />
                <p>Nenhum passo em aberto.</p>
                <span>Selecione um trecho do texto e escolha “Criar tarefa”.</span>
              </div>
            )}
            {doneTasks.length > 0 && (
              <>
                <button
                  type="button"
                  className="completed-toggle"
                  onClick={() => setCompleteVisible(!completeVisible)}
                  aria-expanded={completeVisible}
                >
                  <ChevronDown size={14} />
                  {doneTasks.length} concluídas
                </button>
                {completeVisible &&
                  doneTasks.map((task) => (
                    <LinkedTask key={task.id} task={task} onOpen={() => setSelectedTaskId(task.id)} />
                  ))}
              </>
            )}
            <div className="linked-footnote">
              Os checklists do texto ficam no documento. As tarefas aparecem também no Kanban.
            </div>
          </aside>
        )}
      </div>
      <TaskDialog
        open={origin !== null}
        onClose={() => {
          setOrigin(null);
          setTasksOpen(true);
        }}
        initialProjectId={state.snapshot.projectId}
        source={origin ?? undefined}
        initialTitle={origin?.excerpt.slice(0, 300) ?? ''}
      />
      <TaskDialog open={Boolean(selectedTask)} onClose={() => setSelectedTaskId(null)} task={selectedTask} />
      <Dialog title="Mover para a lixeira?" open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <p className="muted">Você pode restaurar este documento depois. As tarefas vinculadas continuam no Kanban.</p>
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={() => setDeleteOpen(false)}>
            Manter documento
          </button>
          <button type="button" className="button danger" disabled={action.busy} onClick={() => void remove()}>
            Mover para a lixeira
          </button>
        </div>
      </Dialog>
      <Dialog title="Carregar a versão salva?" open={reloadOpen} onClose={() => setReloadOpen(false)}>
        <p className="muted">
          Isso substitui o rascunho desta aba. Para guardar as duas versões, volte e escolha “Salvar meu rascunho como
          cópia”.
        </p>
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={() => setReloadOpen(false)}>
            Voltar
          </button>
          <button type="button" className="button primary" onClick={() => void reloadRemote()}>
            Carregar versão salva
          </button>
        </div>
      </Dialog>
    </div>
  );
}
