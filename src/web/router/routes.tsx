import { createRootRoute, createRoute, lazyRouteComponent, redirect } from '@tanstack/react-router';
import type { IndexSearch } from '../navigation/paths';
import { StartRedirect } from '../navigation/StartRedirect';
import { BoardPage } from '../pages/board';
import { CompletedPage } from '../pages/project/completed';
import { DocumentRoute, DrawingRoute } from '../pages/project/ItemRoute';
import { IndexPage } from '../pages/project/item-index';
import { NoActiveProjectPage } from '../pages/project/NoActiveProjectPage';
import { OverviewPage } from '../pages/project/overview';
import { ProjectRoute } from '../pages/project/ProjectRoute';
import { TrashPage } from '../pages/project/trash';
import { PageStatus } from '../shell';
import { AppRoot } from '../shell/app';
import { Spinner } from '../ui';
import { LegacyRedirect } from './LegacyRedirect';

const text = (value: unknown) => (typeof value === 'string' && value ? value : undefined);

const rootRoute = createRootRoute({ component: AppRoot });

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
    <PageStatus>
      <Spinner />
    </PageStatus>
  ),
});

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projetos/$projectId',
  component: ProjectRoute,
});
const overviewRoute = createRoute({ getParentRoute: () => projectRoute, path: '/', component: OverviewPage });
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
  component: IndexPage,
  validateSearch: (search): IndexSearch => {
    const pasta = text(search.pasta);
    return {
      ...(search.tipo === 'documentos' || search.tipo === 'desenhos' ? { tipo: search.tipo } : {}),
      // Any folder's id here; the page lets go of one the project no longer has.
      ...(pasta && pasta.length <= 64 ? { pasta } : {}),
    };
  },
});
const trashRoute = createRoute({ getParentRoute: () => projectRoute, path: 'lixeira', component: TrashPage });
const completedRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'concluidas',
  component: CompletedPage,
});
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
  legacyRoute('/tarefas/$taskId'),
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
  projectRoute.addChildren([
    overviewRoute,
    boardRoute,
    completedRoute,
    indexRoute,
    trashRoute,
    documentRoute,
    drawingRoute,
  ]),
  ...legacyRoutes,
]);
