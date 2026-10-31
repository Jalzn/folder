import './project-page.css';
import { useParams } from '@tanstack/react-router';
import { RotateCcw } from 'lucide-react';
import { api, requestId } from '../../lib/api';
import { shortDate } from '../../lib/dates';
import { useProjects, useTrash } from '../../lib/queries';
import { useAction } from '../../lib/use-action';
import { Button, ErrorNotice, PageHeader, Spinner, useToast } from '../../ui';

type TrashItem = Awaited<ReturnType<typeof api.workspace.listTrash>>['items'][number];

const typeLabels: Record<TrashItem['type'], string> = { document: 'Documento', drawing: 'Desenho', task: 'Tarefa' };

async function restore(item: TrashItem) {
  const input = { id: item.id, expectedVersion: item.version, requestId: requestId() };
  if (item.type === 'document') await api.workspace.restoreDocument(input);
  else if (item.type === 'drawing') await api.workspace.restoreCanvas(input);
  else await api.workspace.restoreTask(input);
}

/**
 * `/projetos/$projectId/lixeira`: the project's documents, drawings and tasks in the trash, the most
 * recently deleted first, each restorable. Grouping, permanent deletion and emptying come in a later delivery.
 */
export function TrashPage() {
  const { projectId } = useParams({ from: '/projetos/$projectId/lixeira' });
  const project = useProjects(true).data?.find((item) => item.id === projectId);
  const trash = useTrash(projectId);
  const action = useAction();
  const toast = useToast();
  if (!project) return null;
  return (
    <div className="project-page">
      <PageHeader title="Lixeira" description={`Itens excluídos de ${project.name} podem ser restaurados.`} />
      {trash.isPending ? (
        <Spinner />
      ) : trash.error ? (
        <ErrorNotice error={trash.error} retry={() => void trash.refetch()} />
      ) : trash.data.items.length ? (
        <ul className="trash-list">
          {trash.data.items.map((item) => (
            <li key={`${item.type}:${item.id}`} className="trash-row">
              <span className="trash-row__title">{item.title || 'Sem título'}</span>
              <span className="trash-row__meta">
                {typeLabels[item.type]} · {shortDate(item.deletedAt)}
              </span>
              <Button
                size="sm"
                icon={<RotateCcw size={14} />}
                isDisabled={action.busy}
                onPress={() =>
                  void action.run(
                    () => restore(item),
                    () => toast(`“${item.title || 'Sem título'}” restaurado.`),
                  )
                }
              >
                Restaurar
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="project-section__empty">A lixeira está vazia.</p>
      )}
    </div>
  );
}
