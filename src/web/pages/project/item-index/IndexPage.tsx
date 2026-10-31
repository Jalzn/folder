import '../project-page.css';
import './item-index.css';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useCanvases, useDocuments, useProjects } from '../../../lib/queries';
import type { IndexType } from '../../../router/paths';
import { NewItemMenu, PageFrame } from '../../../shell';
import { Button, ErrorNotice, FilterMenu, type FilterOption, PageHeader, Spinner } from '../../../ui';
import { IndexTable } from './IndexTable';
import { indexRows, indexSummary, nextIndexSort, sortIndexRows } from './index-rows';
import { useIndexSort } from './use-index-sort';

type TypeFilter = IndexType | 'todos';

const typeOptions: FilterOption<TypeFilter>[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'desenhos', label: 'Desenhos' },
];

/**
 * `/projetos/$projectId/indice?tipo=`: every document and drawing of the project in a sortable table, the
 * type filter in the address and the order kept on this device. Ligações arrives in stage 11 and grouping
 * by folder in stage 09.
 */
export function IndexPage() {
  const { projectId } = useParams({ from: '/projetos/$projectId/indice' });
  const { tipo } = useSearch({ from: '/projetos/$projectId/indice' });
  const navigate = useNavigate({ from: '/projetos/$projectId/indice' });
  const project = useProjects(true).data?.find((item) => item.id === projectId);
  const documents = useDocuments({ projectId });
  const drawings = useCanvases({ projectId });
  const [sort, setSort] = useIndexSort();
  if (!project) return null;
  const pending = (tipo !== 'desenhos' && documents.isPending) || (tipo !== 'documentos' && drawings.isPending);
  const error = documents.error ?? drawings.error;
  const rows = sortIndexRows(indexRows(documents.data ?? [], drawings.data ?? [], tipo), sort);
  return (
    <PageFrame
      actions={
        !project.archivedAt && (
          <NewItemMenu project={project} trigger={<Button icon={<Plus size={16} />}>Novo</Button>} />
        )
      }
    >
      <div className="project-page">
        <PageHeader title="Índice" description={pending ? undefined : indexSummary(rows.length, project.name, tipo)} />
        <div className="project-filters index-filters">
          <FilterMenu
            label="Tipo"
            options={typeOptions}
            value={tipo ?? 'todos'}
            onChange={(value) => void navigate({ search: value === 'todos' ? {} : { tipo: value }, replace: true })}
          />
        </div>
        <hr className="project-hair" />
        {pending ? (
          <Spinner />
        ) : error ? (
          <ErrorNotice error={error} retry={() => void Promise.all([documents.refetch(), drawings.refetch()])} />
        ) : (
          <IndexTable
            label={`Índice de ${project.name}`}
            projectId={projectId}
            rows={rows}
            sort={sort}
            onSort={(column) => setSort(nextIndexSort(sort, column))}
          />
        )}
      </div>
    </PageFrame>
  );
}
