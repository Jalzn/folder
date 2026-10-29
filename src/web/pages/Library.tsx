import { Link, useParams, useSearch } from '@tanstack/react-router';
import {
  Archive,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  FilePlus2,
  FileText,
  Folder,
  FolderPlus,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useDocuments, useProjects } from '../lib/queries';
import { type DocumentSummary, type Project, relativeDate } from '../lib/types';
import { useApp } from '../shell';
import { Dialog, EmptyState, ErrorNotice, Menu, Spinner, useAction, useRequest } from '../ui';
import { Kanban } from './Board';

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}

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
    <div className={`document-list ${compact ? 'compact' : ''}`}>
      {documents.map((doc) => (
        <Link key={doc.id} to="/documentos/$documentId" params={{ documentId: doc.id }} className="document-row">
          <span className="document-row-icon">
            <FileText size={20} />
          </span>
          <div className="document-row-body">
            <strong>{doc.title}</strong>
            {!compact && <p>{doc.plainText.trim() || 'Uma página aberta para suas ideias.'}</p>}
          </div>
          <div className="document-row-meta">
            {doc.projectId && (
              <span className="project-label">
                <Folder size={12} />
                {projects.find((p) => p.id === doc.projectId)?.name ?? 'Projeto'}
              </span>
            )}
            <time dateTime={doc.updatedAt}>{relativeDate(doc.updatedAt)}</time>
          </div>
          <ArrowUpRight size={16} className="row-arrow" />
        </Link>
      ))}
    </div>
  );
}

export function HomePage() {
  const app = useApp();
  const documents = useDocuments();
  const projects = useProjects();
  const date = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className="page home-page">
      <div className="home-topline">
        <span className="eyebrow">MEU ESPAÇO</span>
        <span>{date}</span>
      </div>
      <PageHeader
        title="Espaço para suas ideias."
        description="Tudo o que você está pensando, criando e colocando em movimento."
      />
      <section className="capture-card">
        <div>
          <span className="capture-kicker">
            <span className="small-blue-line" />
            UM NOVO COMEÇO
          </span>
          <h2>O que está na sua cabeça?</h2>
          <p>
            Uma ideia solta já é um bom começo.
            <br />A organização pode vir depois.
          </p>
          <button
            type="button"
            className="button primary"
            onClick={() => void app.newDocument()}
            disabled={app.creatingDocument}
          >
            <Plus size={17} />
            Começar a escrever
            <ArrowRight size={17} />
          </button>
        </div>
        <div className="paper-stack" aria-hidden="true">
          <div className="paper paper-back" />
          <div className="paper paper-front">
            <span />
            <span />
            <span />
            <i />
            <span />
            <span />
          </div>
          <div className="paper-pin">
            <Plus size={20} />
          </div>
        </div>
      </section>
      <section className="home-section">
        <div className="section-heading">
          <h2>
            <Clock3 size={17} />
            Continue de onde parou
          </h2>
          <Link to="/documentos" className="text-button">
            Ver documentos
            <ArrowRight size={15} />
          </Link>
        </div>
        {documents.isPending ? (
          <Spinner />
        ) : documents.error ? (
          <ErrorNotice error={documents.error} retry={() => void documents.refetch()} />
        ) : documents.data?.length ? (
          <DocumentRows documents={documents.data.slice(0, 5)} projects={projects.data ?? []} />
        ) : (
          <div className="first-document">
            <FileText size={27} />
            <div>
              <strong>Seu primeiro documento está a um clique.</strong>
              <p>Anote uma ideia, faça uma lista ou comece um projeto.</p>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Criar primeiro documento"
              onClick={() => void app.newDocument()}
            >
              <Plus size={20} />
            </button>
          </div>
        )}
      </section>
      <section className="home-section">
        <div className="section-heading">
          <h2>
            <Folder size={17} />
            Seus projetos
          </h2>
          <button type="button" className="text-button" onClick={app.openProjectDialog}>
            <Plus size={15} />
            Novo projeto
          </button>
        </div>
        <div className="project-grid">
          {projects.data?.slice(0, 5).map((project) => (
            <Link
              key={project.id}
              to="/projetos/$projectId"
              params={{ projectId: project.id }}
              className="project-card"
            >
              <div className="project-card-top">
                <Folder size={22} />
                <ArrowUpRight size={16} />
              </div>
              <h3>{project.name}</h3>
              <span>{documents.data?.filter((d) => d.projectId === project.id).length ?? 0} documentos</span>
            </Link>
          ))}
          <button type="button" className="project-card add-project-card" onClick={app.openProjectDialog}>
            <FolderPlus size={23} />
            <strong>Algo novo pela frente?</strong>
            <span>Crie um projeto para reunir suas ideias.</span>
          </button>
        </div>
      </section>
      <footer className="page-footnote">Um passo de cada vez.</footer>
    </div>
  );
}

export function DocumentsPage() {
  const app = useApp();
  const searchParams = useSearch({ strict: false });
  const [query, setQuery] = useState(searchParams.q ?? '');
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    setQuery(searchParams.q ?? '');
  }, [searchParams.q]);
  const projects = useProjects(true);
  const documents = useDocuments({
    query,
    ...(filter === 'all' ? {} : { projectId: filter === 'none' ? null : filter }),
  });
  return (
    <div className="page">
      <PageHeader
        eyebrow="BIBLIOTECA"
        title="Documentos"
        description="Um lugar para cada ideia, inclusive as que ainda estão soltas."
      >
        <button
          type="button"
          className="button primary"
          disabled={app.creatingDocument}
          onClick={() => void app.newDocument()}
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
        <select
          className="filter-select"
          aria-label="Filtrar por projeto"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Todos os projetos</option>
          <option value="none">Sem projeto</option>
          {projects.data?.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
              {project.archivedAt ? ' (arquivado)' : ''}
            </option>
          ))}
        </select>
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
        <DocumentRows documents={documents.data} projects={projects.data ?? []} />
      ) : (
        <EmptyState
          icon={<FileText size={30} />}
          title={query ? 'Nenhum documento encontrado' : 'Uma página em branco. Muitas possibilidades.'}
          description={
            query
              ? 'Tente outra palavra ou escolha outro projeto.'
              : 'Comece escrevendo. Você pode organizar em projetos depois.'
          }
        >
          {!query && (
            <button type="button" className="button primary" onClick={() => void app.newDocument()}>
              <FilePlus2 size={17} />
              Criar documento
            </button>
          )}
        </EmptyState>
      )}
    </div>
  );
}

export function ProjectPage() {
  const { projectId } = useParams({ from: '/projetos/$projectId' });
  const projects = useProjects(true);
  const project = projects.data?.find((p) => p.id === projectId);
  const documents = useDocuments({ projectId });
  const [tabState, setTabState] = useState<{ projectId: string; tab: 'documents' | 'kanban' }>({
    projectId,
    tab: 'documents',
  });
  const tab = tabState.projectId === projectId ? tabState.tab : 'documents';
  const setTab = (next: 'documents' | 'kanban') => setTabState({ projectId, tab: next });
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
          description="Ele pode ter sido removido. Seus documentos continuam na biblioteca."
        />
      </div>
    );
  return (
    <div className={`page project-page ${tab === 'kanban' ? 'board-page' : ''}`}>
      <div className="breadcrumb">
        <Link to="/">Meu espaço</Link>
        <span>/</span>
        <span>Projetos</span>
      </div>
      <PageHeader
        title={project.name}
        description={
          project.archivedAt
            ? 'Projeto arquivado. Seus documentos e tarefas estão preservados.'
            : 'Suas ideias e próximos passos, juntos.'
        }
      >
        <Menu
          label="Opções do projeto"
          trigger={<MoreHorizontal size={20} />}
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
          onKeyDown={(event) => {
            if (['ArrowRight', 'ArrowLeft', 'End'].includes(event.key)) {
              event.preventDefault();
              setTab('kanban');
              document.getElementById('project-kanban-tab')?.focus();
            }
          }}
        >
          <FileText size={16} />
          Documentos<span>{documents.data?.length ?? 0}</span>
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
          onKeyDown={(event) => {
            if (['ArrowRight', 'ArrowLeft', 'Home'].includes(event.key)) {
              event.preventDefault();
              setTab('documents');
              document.getElementById('project-documents-tab')?.focus();
            }
          }}
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
  const documents = useDocuments({ deleted: true });
  const projects = useProjects(true);
  const action = useAction();
  const request = useRequest();
  async function restore(doc: DocumentSummary) {
    const input = { id: doc.id, expectedVersion: doc.version };
    await action.run(
      () => api.workspace.restoreDocument({ ...input, requestId: request.for(input) }),
      () => request.clear(),
    );
  }
  return (
    <div className="page">
      <PageHeader
        eyebrow="SEU ESPAÇO"
        title="Lixeira"
        description="Ideias podem mudar de lugar. Seus documentos podem voltar."
      />
      {documents.isPending ? (
        <Spinner />
      ) : documents.error ? (
        <ErrorNotice error={documents.error} />
      ) : documents.data?.length ? (
        <div className="document-list">
          {documents.data.map((doc) => (
            <div key={doc.id} className="document-row">
              <span className="document-row-icon">
                <FileText size={20} />
              </span>
              <div className="document-row-body">
                <strong>{doc.title}</strong>
                <p>
                  {projects.data?.find((p) => p.id === doc.projectId)?.name ?? 'Sem projeto'} · Excluído{' '}
                  {relativeDate(doc.deletedAt ?? doc.updatedAt).toLocaleLowerCase('pt-BR')}
                </p>
              </div>
              <button
                type="button"
                className="button secondary"
                disabled={action.busy}
                onClick={() => void restore(doc)}
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
          description="Os documentos que você excluir vão aparecer aqui para serem recuperados."
        />
      )}
      <p className="page-footnote">
        <ArrowDownToLine size={14} />
        As tarefas vinculadas permanecem no Kanban quando um documento vai para a lixeira.
      </p>
    </div>
  );
}
