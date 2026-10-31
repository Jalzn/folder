import '../project-page.css';
import './overview.css';
import { useParams } from '@tanstack/react-router';
import { useProject, useProjectOverview } from '../../../lib/queries';
import { PageFrame, ProjectMenu, useProjectActions } from '../../../shell';
import { Banner, Button, ErrorNotice, PageHeader, Spinner } from '../../../ui';
import { NowSection } from './NowSection';
import { overviewSummary } from './overview-text';
import { RecentSection } from './RecentSection';
import { StartSection } from './StartSection';

/**
 * `/projetos/$projectId`: the project's home. The summary line, Começar while the project is empty, Agora
 * and Editados recentemente, with the project's ⋯ in the page bar. "Concluídas · 14 dias" comes in stage 10.
 */
export function OverviewPage() {
  const { projectId } = useParams({ from: '/projetos/$projectId/' });
  const project = useProject(projectId);
  const overview = useProjectOverview(projectId);
  const actions = useProjectActions();
  if (!project) return null;
  const data = overview.data;
  const empty = data && !data.openTasks && !data.recent.length;
  return (
    <PageFrame actions={<ProjectMenu project={project} />}>
      <div className="project-page">
        <PageHeader
          title={project.name}
          description={data ? overviewSummary(data.openTasks, data.lastEdited) : undefined}
        />
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
        <hr className="project-hair" />
        {overview.isPending ? (
          <Spinner />
        ) : overview.error ? (
          <ErrorNotice error={overview.error} retry={() => void overview.refetch()} />
        ) : (
          <>
            {empty && !project.archivedAt && <StartSection projectId={projectId} />}
            <NowSection projectId={projectId} overview={overview.data} />
            <RecentSection projectId={projectId} recent={overview.data.recent} />
          </>
        )}
      </div>
    </PageFrame>
  );
}
