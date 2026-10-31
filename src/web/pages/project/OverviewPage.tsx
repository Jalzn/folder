import './project-page.css';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { ItemRow } from '../../components/item-list/ItemRow';
import { api } from '../../lib/api';
import { useProjects } from '../../lib/queries';
import { paths } from '../../router/paths';
import { ProjectMenu, useProjectActions } from '../../shell';
import { Banner, Button, ErrorNotice, PageHeader, Spinner } from '../../ui';

/** `/projetos/$projectId`: the project's home, with its menu and the items edited last. */
export function OverviewPage() {
  const { projectId } = useParams({ from: '/projetos/$projectId/' });
  const project = useProjects(true).data?.find((item) => item.id === projectId);
  const overview = useQuery({
    queryKey: ['workspace', 'overview', projectId],
    queryFn: () => api.workspace.projectOverview({ projectId }),
  });
  const actions = useProjectActions();
  if (!project) return null;
  return (
    <div className="project-page">
      <PageHeader title={project.name}>
        <ProjectMenu project={project} />
      </PageHeader>
      {project.archivedAt && (
        <Banner
          tone="archived"
          actions={
            <Button size="sm" onPress={() => void actions.unarchive(project)}>
              Desarquivar
            </Button>
          }
        >
          Projeto arquivado. O conteúdo está preservado.
        </Banner>
      )}
      <section className="project-section" aria-labelledby="overview-recent">
        <h2 className="project-section__label" id="overview-recent">
          Editados recentemente
        </h2>
        {overview.isPending ? (
          <Spinner />
        ) : overview.error ? (
          <ErrorNotice error={overview.error} retry={() => void overview.refetch()} />
        ) : overview.data.recent.length ? (
          <ul className="item-list">
            {overview.data.recent.map((item) => (
              <ItemRow
                key={item.id}
                type={item.type}
                title={item.title}
                excerpt={item.excerpt}
                updatedAt={item.updatedAt}
                href={paths.item(projectId, item.type, item.id)}
              />
            ))}
          </ul>
        ) : (
          <p className="project-section__empty">Este projeto está vazio.</p>
        )}
      </section>
    </div>
  );
}
