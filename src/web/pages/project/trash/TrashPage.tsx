import '../project-page.css';
import './trash.css';
import { useParams } from '@tanstack/react-router';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useProjects, useTrash } from '../../../lib/queries';
import type { Project } from '../../../lib/types';
import { PageFrame } from '../../../shell';
import { Button, ErrorNotice, FilterMenu, type FilterOption, PageHeader, Spinner } from '../../../ui';
import { EmptyTrashDialog, PurgeDialog } from './TrashDialogs';
import { TrashGroups } from './TrashGroups';
import { filterTrash, groupTrash, type TrashFilter } from './trash-groups';
import { useTrashActions } from './use-trash-actions';

const filterOptions: FilterOption<TrashFilter>[] = [
  { id: 'all', label: 'Todos' },
  { id: 'document', label: 'Documentos' },
  { id: 'drawing', label: 'Desenhos' },
  { id: 'task', label: 'Tarefas' },
];

/**
 * `/projetos/$projectId/lixeira`: the project's deleted documents, drawings and tasks, grouped by the day
 * they were deleted. Each can be restored or deleted for good; Esvaziar lixeira deletes everything shown.
 */
export function TrashPage() {
  const { projectId } = useParams({ from: '/projetos/$projectId/lixeira' });
  const project = useProjects(true).data?.find((item) => item.id === projectId);
  const trash = useTrash(projectId);
  const [filter, setFilter] = useState<TrashFilter>('all');
  if (!project) return null;
  return <TrashContent project={project} trash={trash} filter={filter} onFilter={setFilter} />;
}

/** The page once its project is known, which the actions need. */
function TrashContent({
  project,
  trash,
  filter,
  onFilter,
}: {
  project: Project;
  trash: ReturnType<typeof useTrash>;
  filter: TrashFilter;
  onFilter: (filter: TrashFilter) => void;
}) {
  const actions = useTrashActions(project);
  const items = trash.data?.items ?? [];
  return (
    <PageFrame
      actions={
        items.length > 0 && (
          <Button variant="ghost-danger" icon={<Trash2 size={16} />} onPress={() => actions.askEmpty(items)}>
            Esvaziar lixeira
          </Button>
        )
      }
    >
      <div className="project-page">
        <PageHeader title="Lixeira" />
        <div className="project-filters trash-filters">
          <p className="project-summary">Itens excluídos de {project.name} podem ser restaurados.</p>
          <FilterMenu label="Tipo" options={filterOptions} value={filter} onChange={onFilter} placement="bottom end" />
        </div>
        <hr className="project-hair" />
        {trash.isPending ? (
          <Spinner />
        ) : trash.error ? (
          <ErrorNotice error={trash.error} retry={() => void trash.refetch()} />
        ) : (
          <TrashGroups
            groups={groupTrash(filterTrash(items, filter))}
            busy={actions.busy}
            onRestore={(item) => void actions.restore(item)}
            onPurge={(item) => void actions.askPurge(item)}
          />
        )}
      </div>
      <PurgeDialog
        confirmation={actions.purge}
        pending={actions.busy}
        onConfirm={() => void actions.confirmPurge()}
        onClose={actions.cancelPurge}
      />
      <EmptyTrashDialog
        projectName={project.name}
        confirmation={actions.empty}
        pending={actions.busy}
        onConfirm={() => void actions.confirmEmpty()}
        onClose={actions.cancelEmpty}
      />
    </PageFrame>
  );
}
