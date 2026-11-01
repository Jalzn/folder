import '../project-page.css';
import './item-index.css';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useEffect } from 'react';
import { useCanvases, useDocuments, useFolders, useProject } from '../../../lib/queries';
import type { IndexSearch } from '../../../router/paths';
import { NewItemMenu, PageFrame } from '../../../shell';
import { Button, ErrorNotice, PageHeader, Spinner } from '../../../ui';
import { IndexFilters } from './IndexFilters';
import { IndexTable } from './IndexTable';
import { filterByFolder, folderFilterName, indexGroups, knownFolderFilter } from './index-groups';
import { indexRows, indexSummary, nextIndexSort, sortIndexRows } from './index-rows';
import { useIndexView } from './use-index-view';

/**
 * `/projetos/$projectId/indice?tipo=&pasta=`: every document and drawing of the project in a sortable table,
 * the filters in the address, grouped by folder unless that is turned off, and the order and the grouping
 * kept on this device. Ligações arrives in stage 11.
 */
export function IndexPage() {
  const { projectId } = useParams({ from: '/projetos/$projectId/indice' });
  const { tipo, pasta: asked } = useSearch({ from: '/projetos/$projectId/indice' });
  const navigate = useNavigate({ from: '/projetos/$projectId/indice' });
  const project = useProject(projectId);
  const documents = useDocuments({ projectId });
  const drawings = useCanvases({ projectId });
  const folderList = useFolders(projectId);
  const view = useIndexView();
  const folders = folderList.data ?? [];
  const pasta = folderList.data ? knownFolderFilter(asked, folders) : asked;
  const setSearch = (search: IndexSearch) => void navigate({ search, replace: true });
  // A folder the project no longer has, from an old link or deleted meanwhile, is Todas.
  // biome-ignore lint/correctness/useExhaustiveDependencies: Only a change of the filter or the folders asks.
  useEffect(() => {
    if (folderList.data && asked !== undefined && pasta === undefined) setSearch(tipo ? { tipo } : {});
  }, [folderList.data, asked, pasta]);
  if (!project) return null;
  const pending =
    folderList.isPending ||
    (tipo !== 'desenhos' && documents.isPending) ||
    (tipo !== 'documentos' && drawings.isPending);
  const error = documents.error ?? drawings.error ?? folderList.error;
  const rows = filterByFolder(
    sortIndexRows(indexRows(documents.data ?? [], drawings.data ?? [], tipo), view.sort),
    pasta,
    folders,
  );
  const groups = view.grouped ? indexGroups(rows, folders) : null;
  return (
    <PageFrame
      actions={
        !project.archivedAt && (
          <NewItemMenu project={project} trigger={<Button icon={<Plus size={16} />}>Novo</Button>} />
        )
      }
    >
      <div className="project-page">
        <PageHeader
          title="Índice"
          description={
            pending ? undefined : indexSummary(rows.length, project.name, tipo, folderFilterName(pasta, folders))
          }
        />
        <IndexFilters
          tipo={tipo}
          pasta={pasta}
          folders={folders}
          grouped={view.grouped}
          onChange={setSearch}
          onGroupedChange={view.setGrouped}
        />
        <hr className="project-hair" />
        {pending ? (
          <Spinner />
        ) : error ? (
          <ErrorNotice
            error={error}
            retry={() => void Promise.all([documents.refetch(), drawings.refetch(), folderList.refetch()])}
          />
        ) : (
          <IndexTable
            label={`Índice de ${project.name}`}
            projectId={projectId}
            rows={rows}
            groups={groups}
            folders={folders}
            sort={view.sort}
            onSort={(column) => view.setSort(nextIndexSort(view.sort, column))}
          />
        )}
      </div>
    </PageFrame>
  );
}
