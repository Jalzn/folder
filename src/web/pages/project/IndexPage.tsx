import './project-page.css';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button as AriaButton } from 'react-aria-components';
import { ItemRow } from '../../components/item-list/ItemRow';
import { useCanvases, useDocuments, useProjects } from '../../lib/queries';
import type { ItemType } from '../../lib/types';
import { type IndexType, paths } from '../../router/paths';
import { NewItemMenu } from '../../shell';
import { ErrorNotice, PageHeader, SearchField, Spinner } from '../../ui';

const searchLabels: Record<IndexType | 'all', string> = {
  documentos: 'Buscar nos documentos',
  desenhos: 'Buscar nos desenhos',
  all: 'Buscar no índice',
};

/**
 * `/projetos/$projectId/indice?tipo=`: every document and drawing of the project, the last edited first,
 * filtered by type. The sortable table of the Índice replaces this list in a later delivery.
 */
export function IndexPage() {
  const { projectId } = useParams({ from: '/projetos/$projectId/indice' });
  const { tipo, q = '' } = useSearch({ from: '/projetos/$projectId/indice' });
  const navigate = useNavigate({ from: '/projetos/$projectId/indice' });
  const project = useProjects(true).data?.find((item) => item.id === projectId);
  const query = q.trim();
  const documents = useDocuments({ projectId, ...(query ? { query } : {}) });
  const drawings = useCanvases({ projectId, ...(query ? { query } : {}) });
  const types: ItemType[] =
    tipo === 'documentos' ? ['document'] : tipo === 'desenhos' ? ['drawing'] : ['document', 'drawing'];
  const items = [
    ...(types.includes('document') ? (documents.data ?? []).map((item) => ({ type: 'document' as const, item })) : []),
    ...(types.includes('drawing') ? (drawings.data ?? []).map((item) => ({ type: 'drawing' as const, item })) : []),
  ].sort((a, b) => b.item.updatedAt.localeCompare(a.item.updatedAt));
  const pending =
    (types.includes('document') && documents.isPending) || (types.includes('drawing') && drawings.isPending);
  const error = documents.error ?? drawings.error;
  if (!project) return null;
  return (
    <div className="project-page">
      <PageHeader
        title="Índice"
        description={`${items.length} ${items.length === 1 ? 'item' : 'itens'} em ${project.name}.`}
      >
        <NewItemMenu
          project={project}
          trigger={
            <AriaButton className="btn" data-variant="secondary" data-size="md">
              <Plus size={16} aria-hidden="true" />
              Novo
            </AriaButton>
          }
        />
      </PageHeader>
      <div className="project-toolbar">
        <SearchField
          aria-label={searchLabels[tipo ?? 'all']}
          placeholder="Título ou texto"
          value={q}
          onChange={(value) =>
            void navigate({
              search: ({ q: _previous, ...rest }) => (value ? { ...rest, q: value } : rest),
              replace: true,
            })
          }
        />
      </div>
      {pending ? (
        <Spinner />
      ) : error ? (
        <ErrorNotice error={error} retry={() => void Promise.all([documents.refetch(), drawings.refetch()])} />
      ) : items.length ? (
        <ul className="item-list">
          {items.map(({ type, item }) => (
            <ItemRow
              key={`${type}:${item.id}`}
              type={type}
              title={item.title}
              excerpt={item.plainText}
              updatedAt={item.updatedAt}
              href={paths.item(projectId, type, item.id)}
            />
          ))}
        </ul>
      ) : (
        <p className="project-section__empty">{query ? 'Nada encontrado.' : 'Nada aqui.'}</p>
      )}
    </div>
  );
}
