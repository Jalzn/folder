import { Link, useSearch } from '@tanstack/react-router';
import { ArrowUpRight, FileText, Folder, PenTool, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCanvases, useProjects } from '../lib/queries';
import { type CanvasSummary, type DocumentSummary, type Project, relativeDate } from '../lib/types';
import { useApp } from '../shell';
import { EmptyState, ErrorNotice, PageHeader, Spinner } from '../ui';

export type ContentSummary = { kind: 'document'; item: DocumentSummary } | { kind: 'canvas'; item: CanvasSummary };

export function ContentRows({
  items,
  projects = [],
  compact = false,
  showKind = false,
}: {
  items: ContentSummary[];
  projects?: Project[];
  compact?: boolean;
  showKind?: boolean;
}) {
  return (
    <div className={`document-list ${compact ? 'compact' : ''}`}>
      {items.map(({ kind, item }) => {
        const label = kind === 'canvas' ? 'Desenho' : 'Documento';
        const body = (
          <>
            <span className="document-row-icon" role="img" aria-label={label}>
              {kind === 'canvas' ? <PenTool size={20} /> : <FileText size={20} />}
            </span>
            <div className="document-row-body">
              <strong>{item.title}</strong>
              {!compact && (
                <p>
                  {showKind ? `${label} · ` : ''}
                  {item.plainText.trim() ||
                    (kind === 'canvas'
                      ? 'Um espaço aberto para desenhar suas ideias.'
                      : 'Uma página aberta para suas ideias.')}
                </p>
              )}
            </div>
            <div className="document-row-meta">
              {item.projectId && (
                <span className="project-label">
                  <Folder size={12} />
                  {projects.find((project) => project.id === item.projectId)?.name ?? 'Projeto'}
                </span>
              )}
              <time dateTime={item.updatedAt}>{relativeDate(item.updatedAt)}</time>
            </div>
            <ArrowUpRight size={16} className="row-arrow" />
          </>
        );
        return kind === 'canvas' ? (
          <Link
            key={`canvas:${item.id}`}
            to="/desenhos/$canvasId"
            params={{ canvasId: item.id }}
            preload={false}
            className="document-row"
          >
            {body}
          </Link>
        ) : (
          <Link
            key={`document:${item.id}`}
            to="/documentos/$documentId"
            params={{ documentId: item.id }}
            className="document-row"
          >
            {body}
          </Link>
        );
      })}
    </div>
  );
}

export function CanvasRows({
  canvases,
  projects = [],
  compact = false,
}: {
  canvases: CanvasSummary[];
  projects?: Project[];
  compact?: boolean;
}) {
  return (
    <ContentRows items={canvases.map((item) => ({ kind: 'canvas', item }))} projects={projects} compact={compact} />
  );
}

export function CanvasesPage() {
  const app = useApp();
  const searchParams = useSearch({ strict: false });
  const [query, setQuery] = useState(searchParams.q ?? '');
  const [filter, setFilter] = useState('all');
  useEffect(() => setQuery(searchParams.q ?? ''), [searchParams.q]);
  const projects = useProjects(true);
  const canvases = useCanvases({
    query,
    ...(filter === 'all' ? {} : { projectId: filter === 'none' ? null : filter }),
  });
  const selectedProject = projects.data?.find((project) => project.id === filter);
  const archivedProject = Boolean(selectedProject?.archivedAt);
  const create = async () => {
    if (!archivedProject) await app.newCanvas(selectedProject?.id ?? null);
  };
  const filtered = Boolean(query.trim()) || filter !== 'all';
  return (
    <div className="page">
      <PageHeader title="Desenhos" description="Rascunhe um fluxo, conecte ideias ou comece por um traço.">
        <button
          type="button"
          className="button primary"
          disabled={app.creatingCanvas || archivedProject}
          onClick={() => void create()}
        >
          <Plus size={17} />
          Novo desenho
        </button>
      </PageHeader>
      <div className="list-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar nos desenhos…"
            aria-label="Buscar nos desenhos"
            maxLength={300}
          />
        </label>
        <select
          className="filter-select"
          aria-label="Filtrar por projeto"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
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
      {archivedProject && (
        <p className="page-footnote">Este projeto está arquivado. Escolha outro filtro para criar um desenho.</p>
      )}
      {projects.error && <ErrorNotice error={projects.error} retry={() => void projects.refetch()} />}
      <div className="list-caption">
        <span>{canvases.data?.length ?? 0} desenhos</span>
        <span>Última edição</span>
      </div>
      {canvases.isPending ? (
        <Spinner />
      ) : canvases.error ? (
        <ErrorNotice error={canvases.error} retry={() => void canvases.refetch()} />
      ) : canvases.data?.length ? (
        <CanvasRows canvases={canvases.data} projects={projects.data ?? []} />
      ) : (
        <EmptyState
          icon={<PenTool size={30} />}
          title={filtered ? 'Nenhum desenho encontrado' : 'Uma ideia também pode começar com um desenho.'}
          description={
            filtered
              ? 'Tente outra palavra ou escolha outro projeto.'
              : 'Use formas, setas e texto para explorar o que você está pensando.'
          }
        >
          {!filtered && (
            <button
              type="button"
              className="button primary"
              disabled={app.creatingCanvas}
              onClick={() => void create()}
            >
              <Plus size={17} />
              Criar desenho
            </button>
          )}
        </EmptyState>
      )}
    </div>
  );
}
