import { useParams, useSearch } from '@tanstack/react-router';
import {
  Archive,
  ArrowDownToLine,
  FilePlus2,
  FileText,
  Folder,
  LayoutGrid,
  PenTool,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { type KeyboardEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useCanvases, useDocuments, useProjects } from '../lib/queries';
import { type DocumentSummary, type Project, relativeDate } from '../lib/types';
import { useAction } from '../lib/use-action';
import { useRequest } from '../lib/use-request';
import { useApp } from '../shell';
import { ActionMenu, Dialog, EmptyState, ErrorNotice, PageHeader, Spinner } from '../ui';
import { Kanban } from './Board';
import { CanvasesPage, CanvasRows, ContentRows, type ContentSummary } from './Canvases';

export function DocumentRows({
  documents,
  projects = [],
  compact = false,
}: {
  documents: DocumentSummary[];
  projects?: Project[];
  compact?: boolean;
}) {
  return (
    <ContentRows items={documents.map((item) => ({ kind: 'document', item }))} projects={projects} compact={compact} />
  );
}

/** The project's documents. Until the Índice of stage 08 arrives, its address shows this list. */
function DocumentsPage({ projectId }: { projectId: string }) {
  const app = useApp();
  const searchParams = useSearch({ strict: false });
  const [query, setQuery] = useState(searchParams.q ?? '');
  useEffect(() => {
    setQuery(searchParams.q ?? '');
  }, [searchParams.q]);
  const documents = useDocuments({ query, projectId });
  return (
    <div className="page">
      <PageHeader title="Documentos" description="Um lugar para cada ideia do projeto.">
        <button
          type="button"
          className="button primary"
          disabled={app.creatingDocument}
          onClick={() => void app.newDocument(projectId)}
        >
          <Plus size={17} />
          Novo documento
        </button>
      </PageHeader>
      <div className="list-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar nos documentos…"
            aria-label="Buscar nos documentos"
            maxLength={300}
          />
        </label>
      </div>
      <div className="list-caption">
        <span>{documents.data?.length ?? 0} documentos</span>
        <span>Última edição</span>
      </div>
      {documents.isPending ? (
        <Spinner />
      ) : documents.error ? (
        <ErrorNotice error={documents.error} retry={() => void documents.refetch()} />
      ) : documents.data?.length ? (
        <DocumentRows documents={documents.data} />
      ) : (
        <EmptyState
          icon={<FileText size={30} />}
          title={query ? 'Nenhum documento encontrado' : 'Uma página em branco. Muitas possibilidades.'}
          description={query ? 'Tente outra palavra.' : 'Comece escrevendo um documento neste projeto.'}
        >
          {!query && (
            <button type="button" className="button primary" onClick={() => void app.newDocument(projectId)}>
              <FilePlus2 size={17} />
              Criar documento
            </button>
          )}
        </EmptyState>
      )}
    </div>
  );
}

/** `/projetos/$projectId/indice`: the project's documents or drawings, by `tipo`. */
export function ProjectIndexPage() {
  const { projectId } = useParams({ from: '/projetos/$projectId/indice' });
  const { tipo } = useSearch({ from: '/projetos/$projectId/indice' });
  return tipo === 'desenhos' ? <CanvasesPage projectId={projectId} /> : <DocumentsPage projectId={projectId} />;
}

export function ProjectPage() {
  const { projectId } = useParams({ from: '/projetos/$projectId' });
  const projects = useProjects(true);
  const project = projects.data?.find((p) => p.id === projectId);
  const documents = useDocuments({ projectId });
  const canvases = useCanvases({ projectId });
  type ProjectTab = 'documents' | 'canvases' | 'kanban';
  const [tabState, setTabState] = useState<{ projectId: string; tab: ProjectTab }>({
    projectId,
    tab: 'documents',
  });
  const tab = tabState.projectId === projectId ? tabState.tab : 'documents';
  const setTab = (next: ProjectTab) => setTabState({ projectId, tab: next });
  function navigateTab(event: KeyboardEvent<HTMLButtonElement>, current: ProjectTab) {
    const tabs: ProjectTab[] = ['documents', 'canvases', 'kanban'];
    const index = tabs.indexOf(current);
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : event.key === 'ArrowRight'
            ? (index + 1) % tabs.length
            : event.key === 'ArrowLeft'
              ? (index + tabs.length - 1) % tabs.length
              : null;
    if (nextIndex === null) return;
    const next = tabs[nextIndex];
    if (!next) return;
    event.preventDefault();
    setTab(next);
    document.getElementById(`project-${next}-tab`)?.focus();
  }
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState('');
  const app = useApp();
  const action = useAction();
  const request = useRequest();
  async function update(input: { name?: string; archived?: boolean }) {
    if (!project) return;
    const value = { ...input, id: project.id, expectedVersion: project.version };
    await action.run(
      () => api.workspace.updateProject({ ...value, requestId: request.for(value) }),
      () => {
        request.clear();
        setRenameOpen(false);
      },
    );
  }
  if (projects.isPending)
    return (
      <div className="page">
        <Spinner />
      </div>
    );
  if (projects.error)
    return (
      <div className="page">
        <ErrorNotice error={projects.error} retry={() => void projects.refetch()} />
      </div>
    );
  if (!project)
    return (
      <div className="page">
        <EmptyState
          icon={<Folder size={30} />}
          title="Projeto não encontrado"
          description="Ele pode ter sido removido. Seus documentos e desenhos continuam na biblioteca."
        />
      </div>
    );
  return (
    <div className={`page project-page ${tab === 'kanban' ? 'board-page' : ''}`}>
      <PageHeader
        title={project.name}
        description={
          project.archivedAt
            ? 'Projeto arquivado. Seus documentos, desenhos e tarefas estão preservados.'
            : 'Suas ideias e próximos passos, juntos.'
        }
      >
        <ActionMenu
          label="Opções do projeto"
          items={[
            {
              label: 'Renomear projeto',
              icon: <Folder size={16} />,
              action: () => {
                setName(project.name);
                setRenameOpen(true);
              },
            },
            {
              label: project.archivedAt ? 'Reativar projeto' : 'Arquivar projeto',
              icon: <Archive size={16} />,
              action: () => void update({ archived: !project.archivedAt }),
            },
          ]}
        />
        {tab === 'documents' && !project.archivedAt && (
          <button
            type="button"
            className="button primary"
            disabled={app.creatingDocument}
            onClick={() => void app.newDocument(project.id)}
          >
            <Plus size={17} />
            Novo documento
          </button>
        )}
        {tab === 'canvases' && !project.archivedAt && (
          <button
            type="button"
            className="button primary"
            disabled={app.creatingCanvas}
            onClick={() => void app.newCanvas(project.id)}
          >
            <Plus size={17} />
            Novo desenho
          </button>
        )}
      </PageHeader>
      <div className="tabs" role="tablist" aria-label="Conteúdo do projeto">
        <button
          type="button"
          id="project-documents-tab"
          role="tab"
          tabIndex={tab === 'documents' ? 0 : -1}
          aria-selected={tab === 'documents'}
          aria-controls="project-documents-panel"
          className={tab === 'documents' ? 'active' : ''}
          onClick={() => setTab('documents')}
          onKeyDown={(event) => navigateTab(event, 'documents')}
        >
          <FileText size={16} />
          Documentos<span>{documents.data?.length ?? 0}</span>
        </button>
        <button
          type="button"
          id="project-canvases-tab"
          role="tab"
          tabIndex={tab === 'canvases' ? 0 : -1}
          aria-selected={tab === 'canvases'}
          aria-controls="project-canvases-panel"
          className={tab === 'canvases' ? 'active' : ''}
          onClick={() => setTab('canvases')}
          onKeyDown={(event) => navigateTab(event, 'canvases')}
        >
          <PenTool size={16} />
          Desenhos<span>{canvases.data?.length ?? 0}</span>
        </button>
        <button
          type="button"
          id="project-kanban-tab"
          role="tab"
          tabIndex={tab === 'kanban' ? 0 : -1}
          aria-selected={tab === 'kanban'}
          aria-controls="project-kanban-panel"
          className={tab === 'kanban' ? 'active' : ''}
          onClick={() => setTab('kanban')}
          onKeyDown={(event) => navigateTab(event, 'kanban')}
        >
          <LayoutGrid size={16} />
          Kanban
        </button>
      </div>
      {tab === 'documents' ? (
        <section id="project-documents-panel" role="tabpanel" aria-labelledby="project-documents-tab">
          {documents.isPending ? (
            <Spinner />
          ) : documents.error ? (
            <ErrorNotice error={documents.error} />
          ) : documents.data?.length ? (
            <DocumentRows documents={documents.data} />
          ) : (
            <EmptyState
              icon={<FileText size={30} />}
              title="O primeiro capítulo do projeto"
              description="Reúna referências, rascunhe um plano ou coloque suas ideias no papel."
            >
              {!project.archivedAt && (
                <button type="button" className="button primary" onClick={() => void app.newDocument(project.id)}>
                  <Plus size={17} />
                  Escrever um documento
                </button>
              )}
            </EmptyState>
          )}
        </section>
      ) : tab === 'canvases' ? (
        <section id="project-canvases-panel" role="tabpanel" aria-labelledby="project-canvases-tab">
          {canvases.isPending ? (
            <Spinner />
          ) : canvases.error ? (
            <ErrorNotice error={canvases.error} retry={() => void canvases.refetch()} />
          ) : canvases.data?.length ? (
            <CanvasRows canvases={canvases.data} />
          ) : (
            <EmptyState
              icon={<PenTool size={30} />}
              title="Dê forma às ideias do projeto"
              description="Desenhe um fluxo, explore uma interface ou conecte suas referências."
            >
              {!project.archivedAt && (
                <button
                  type="button"
                  className="button primary"
                  disabled={app.creatingCanvas}
                  onClick={() => void app.newCanvas(project.id)}
                >
                  <Plus size={17} />
                  Criar desenho
                </button>
              )}
            </EmptyState>
          )}
        </section>
      ) : (
        <section id="project-kanban-panel" role="tabpanel" aria-labelledby="project-kanban-tab">
          <Kanban projectId={project.id} archived={Boolean(project.archivedAt)} />
        </section>
      )}
      <Dialog title="Renomear projeto" open={renameOpen} onClose={() => setRenameOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void update({ name: name.trim() });
          }}
        >
          <label className="field">
            Nome do projeto
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
          </label>
          <div className="dialog-actions">
            <button type="button" className="button secondary" onClick={() => setRenameOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="button primary" disabled={action.busy || !name.trim()}>
              Salvar nome
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export function TrashPage() {
  const { projectId } = useParams({ from: '/projetos/$projectId/lixeira' });
  const documents = useDocuments({ deleted: true, projectId });
  const canvases = useCanvases({ deleted: true, projectId });
  const action = useAction();
  const request = useRequest();
  const items: ContentSummary[] = [
    ...(documents.data ?? []).map((item) => ({ kind: 'document' as const, item })),
    ...(canvases.data ?? []).map((item) => ({ kind: 'canvas' as const, item })),
  ];
  items.sort((a, b) => (b.item.deletedAt ?? b.item.updatedAt).localeCompare(a.item.deletedAt ?? a.item.updatedAt));
  async function restore(entry: ContentSummary) {
    const input = { id: entry.item.id, expectedVersion: entry.item.version };
    const requestId = request.for({ ...input, kind: entry.kind });
    await action.run(
      () =>
        entry.kind === 'canvas'
          ? api.workspace.restoreCanvas({ ...input, requestId })
          : api.workspace.restoreDocument({ ...input, requestId }),
      () => request.clear(),
    );
  }
  return (
    <div className="page">
      <PageHeader title="Lixeira" description="Ideias podem mudar de lugar. Seus documentos e desenhos podem voltar." />
      {documents.isPending || canvases.isPending ? (
        <Spinner />
      ) : documents.error || canvases.error ? (
        <ErrorNotice
          error={documents.error ?? canvases.error}
          retry={() => {
            void documents.refetch();
            void canvases.refetch();
          }}
        />
      ) : items.length ? (
        <div className="document-list">
          {items.map((entry) => (
            <div key={`${entry.kind}:${entry.item.id}`} className="document-row">
              <span
                className="document-row-icon"
                role="img"
                aria-label={entry.kind === 'canvas' ? 'Desenho' : 'Documento'}
              >
                {entry.kind === 'canvas' ? <PenTool size={20} /> : <FileText size={20} />}
              </span>
              <div className="document-row-body">
                <strong>{entry.item.title}</strong>
                <p>
                  {entry.kind === 'canvas' ? 'Desenho' : 'Documento'} · Excluído{' '}
                  {relativeDate(entry.item.deletedAt ?? entry.item.updatedAt).toLocaleLowerCase('pt-BR')}
                </p>
              </div>
              <button
                type="button"
                className="button secondary"
                disabled={action.busy}
                onClick={() => void restore(entry)}
              >
                <RotateCcw size={16} />
                Restaurar
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Trash2 size={29} />}
          title="Tudo no seu lugar"
          description="Os documentos e desenhos que você excluir vão aparecer aqui para serem recuperados."
        />
      )}
      <p className="page-footnote">
        <ArrowDownToLine size={14} />
        As tarefas vinculadas permanecem no Kanban quando um documento vai para a lixeira.
      </p>
    </div>
  );
}
