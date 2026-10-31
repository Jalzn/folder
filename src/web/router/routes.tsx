import { createRootRoute, createRoute, lazyRouteComponent, redirect } from '@tanstack/react-router';
import { BoardPage } from '../pages/Board';
import { ProjectIndexPage, ProjectPage, TrashPage } from '../pages/Library';
import { DocumentRoute, DrawingRoute } from '../pages/project/ItemRoute';
import { NoActiveProjectPage } from '../pages/project/NoActiveProjectPage';
import { ProjectRoute } from '../pages/project/ProjectRoute';
import { Shell } from '../shell';
import { Spinner } from '../ui';
import { LegacyRedirect } from './LegacyRedirect';
import type { IndexType } from './paths';
import { StartRedirect } from './StartRedirect';

const text = (value: unknown) => (typeof value === 'string' && value ? value : undefined);

const rootRoute = createRootRoute({ component: Shell });

const startRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: StartRedirect });
/** The login shows wherever the session is missing; signed in, `/entrar` continues like `/`. */
const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/entrar', component: StartRedirect });
const noProjectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projetos',
  component: NoActiveProjectPage,
});
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/perfil',
  component: lazyRouteComponent(() => import('../pages/profile/ProfilePage'), 'ProfilePage'),
  pendingComponent: () => (
    <div className="page">
      <Spinner />
    </div>
  ),
});

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projetos/$projectId',
  component: ProjectRoute,
});
const overviewRoute = createRoute({ getParentRoute: () => projectRoute, path: '/', component: ProjectPage });
const boardRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'quadro',
  component: BoardPage,
  validateSearch: (search): { tarefa?: string } => {
    const tarefa = text(search.tarefa);
    return tarefa ? { tarefa } : {};
  },
});
const indexRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'indice',
  component: ProjectIndexPage,
  // `q` serves the lists this address shows until the Índice arrives; the old lists' `q` is dropped.
  validateSearch: (search): { tipo?: IndexType; q?: string } => {
    const q = text(search.q);
    return {
      ...(search.tipo === 'documentos' || search.tipo === 'desenhos' ? { tipo: search.tipo } : {}),
      ...(q ? { q } : {}),
    };
  },
});
const trashRoute = createRoute({ getParentRoute: () => projectRoute, path: 'lixeira', component: TrashPage });
const documentRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'documentos/$documentId',
  component: DocumentRoute,
  validateSearch: (search): { bloco?: string } => {
    const bloco = text(search.bloco);
    return bloco ? { bloco } : {};
  },
});
const drawingRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'desenhos/$canvasId',
  component: DrawingRoute,
});

/** An address before stage 08, which redirects; see redirects.ts. */
const legacyRoute = <Path extends string>(path: Path) =>
  createRoute({ getParentRoute: () => rootRoute, path, component: LegacyRedirect });
const legacyRoutes = [
  legacyRoute('/documentos'),
  legacyRoute('/documentos/$documentId'),
  legacyRoute('/desenhos'),
  legacyRoute('/desenhos/$canvasId'),
  legacyRoute('/kanban'),
  legacyRoute('/lixeira'),
] as const;
const oldLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: () => {
    throw redirect({ to: '/entrar', replace: true });
  },
});

export const routeTree = rootRoute.addChildren([
  startRoute,
  loginRoute,
  oldLoginRoute,
  noProjectRoute,
  profileRoute,
  projectRoute.addChildren([overviewRoute, boardRoute, indexRoute, trashRoute, documentRoute, drawingRoute]),
  ...legacyRoutes,
]);
