import './project-page.css';
import { useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { shortInstant } from '../../lib/dates/dates';
import { useProjects } from '../../lib/queries';
import { paths } from '../../navigation/paths';
import { StartRedirect } from '../../navigation/StartRedirect';
import { PageFrame, useApp, useProjectActions } from '../../shell';
import { Button, ErrorNotice, PageHeader, ProjectMark, Spinner } from '../../ui';
import { emptyStateKind } from './empty-state-kind';

const copy = {
  'first-project': {
    title: 'Comece um projeto',
    description: 'No Tinyfold, documentos, desenhos e tarefas vivem dentro de um projeto.',
  },
  'all-archived': {
    title: 'Nenhum projeto ativo',
    description: 'Crie um projeto ou desarquive um dos arquivados. O conteúdo deles está preservado.',
  },
} as const;

/**
 * `/projetos` without an active project: a new installation, or every project archived. It offers "Novo
 * projeto" and lists the archived projects to open or unarchive. With an active project it opens like `/`.
 */
export function NoActiveProjectPage() {
  const app = useApp();
  const navigate = useNavigate();
  const projects = useProjects(true);
  const actions = useProjectActions();
  if (projects.isPending)
    return (
      <PageFrame>
        <div className="project-page">
          <Spinner />
        </div>
      </PageFrame>
    );
  if (projects.error)
    return (
      <PageFrame>
        <div className="project-page">
          <ErrorNotice error={projects.error} retry={() => void projects.refetch()} />
        </div>
      </PageFrame>
    );
  const kind = emptyStateKind(projects.data);
  if (!kind) return <StartRedirect />;
  const archived = projects.data.filter((project) => project.archivedAt);
  return (
    <PageFrame>
      <div className="project-page empty-projects">
        <PageHeader title={copy[kind].title} description={copy[kind].description} />
        <Button variant="primary" icon={<Plus size={16} />} onPress={() => app.openProjectDialog()}>
          Novo projeto
        </Button>
        {archived.length > 0 && (
          <section className="project-section empty-projects__archived" aria-labelledby="archived-projects">
            <h2 className="project-section__label" id="archived-projects">
              Arquivados
            </h2>
            <ul className="archived-list">
              {archived.map((project) => (
                <li key={project.id} className="archived-row">
                  <ProjectMark name={project.name} color={project.color} />
                  <span className="archived-row__name">{project.name}</span>
                  <span className="archived-row__date">
                    arquivado em {shortInstant(project.archivedAt ?? project.updatedAt)}
                  </span>
                  <Button size="sm" onPress={() => void navigate({ href: paths.overview(project.id) })}>
                    Abrir
                  </Button>
                  <Button size="sm" onPress={() => void actions.unarchive(project, { open: true })}>
                    Desarquivar
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </PageFrame>
  );
}
