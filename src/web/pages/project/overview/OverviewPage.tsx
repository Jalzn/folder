import '../project-page.css';
import './overview.css';
import { useParams } from '@tanstack/react-router';
import { useMemo } from 'react';
import { useColumns, useLabels, useProject, useProjectOverview } from '../../../lib/queries';
import { PageFrame, ProjectMenu, useProjectActions } from '../../../shell';
import { Banner, Button, ErrorNotice, PageHeader, Spinner } from '../../../ui';
import { DoneSection } from './DoneSection';
import { NowSection } from './NowSection';
import { overviewSummary } from './overview-text';
import { RecentSection } from './RecentSection';
import { StartSection } from './StartSection';

/**
 * `/projetos/$projectId`: the project's home. The summary line with the late tasks, Começar while the project is
 * empty, Agora, Concluídas · 14 dias and Editados recentemente, with the project's ⋯ in the page bar.
 */
export function OverviewPage() {
  const { projectId } = useParams({ from: '/projetos/$projectId/' });
  const project = useProject(projectId);
  const overview = useProjectOverview(projectId);
  const actions = useProjectActions();
  const columns = useColumns().data?.columns ?? [];
  const labelList = useLabels().data;
  const labels = useMemo(() => new Map((labelList ?? []).map((label) => [label.id, label])), [labelList]);
  if (!project) return null;
  const data = overview.data;
  const empty = data && !data.openTasks && !data.recent.length;
  return (
    <PageFrame actions={<ProjectMenu project={project} />}>
      <div className="project-page">
        <PageHeader
          title={project.name}
          description={data ? overviewSummary(data.openTasks, data.overdueTasks, data.lastEdited) : undefined}
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
            <NowSection projectId={projectId} overview={overview.data} columns={columns} labels={labels} />
            <DoneSection projectId={projectId} overview={overview.data} columns={columns} labels={labels} />
            <RecentSection projectId={projectId} recent={overview.data.recent} />
          </>
        )}
      </div>
    </PageFrame>
  );
}
