import { Outlet, useLocation, useParams } from '@tanstack/react-router';
import { useProjects } from '../../lib/queries';
import { parseProjectPath } from '../../router/paths';
import { ErrorNotice, Spinner } from '../../ui';
import { NotFoundPage } from './NotFoundPage';

/**
 * Every address inside a project. Its pages need the project to exist; an item address only needs the
 * item, whose page moves it to the item's current project.
 */
export function ProjectRoute() {
  const { projectId } = useParams({ from: '/projetos/$projectId' });
  const pathname = useLocation({ select: (location) => location.pathname });
  const projects = useProjects(true);
  if (parseProjectPath(pathname)?.item) return <Outlet />;
  if (projects.isPending)
    return (
      <div className="page">
        <Spinner />
      </div>
    );
  if (projects.error)
    return (
      <div className="page">
        <ErrorNotice error={projects.error} retry={() => void projects.refetch()} />
      </div>
    );
  if (!projects.data.some((project) => project.id === projectId))
    return <NotFoundPage title="Este projeto não existe" description="Escolha outro projeto no seletor." />;
  return <Outlet />;
}
