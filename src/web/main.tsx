import '@fontsource-variable/inter';
import '@blocknote/mantine/style.css';
import './styles.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { createRootRoute, createRoute, createRouter, lazyRouteComponent, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { I18nProvider } from 'react-aria-components';
import { createRoot } from 'react-dom/client';
import { queryClient } from './lib/api';
import { BoardPage } from './pages/Board';
import { DocumentsPage, HomePage, ProjectPage, TrashPage } from './pages/Library';
import { ProfilePage } from './pages/Profile';
import { Shell } from './shell';
import { Spinner, ToastProvider } from './ui';

const rootRoute = createRootRoute({ component: Shell });
const routeTree = rootRoute.addChildren([
  createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/login', component: HomePage }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/documentos',
    component: DocumentsPage,
    validateSearch: (search): { q?: string } => (typeof search.q === 'string' ? { q: search.q } : {}),
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/documentos/$documentId',
    component: lazyRouteComponent(() => import('./pages/DocumentEditor'), 'DocumentPage'),
    pendingComponent: () => (
      <div className="page">
        <Spinner label="Abrindo editor…" />
      </div>
    ),
    validateSearch: (search): { bloco?: string } => (typeof search.bloco === 'string' ? { bloco: search.bloco } : {}),
  }),
  createRoute({ getParentRoute: () => rootRoute, path: '/projetos/$projectId', component: ProjectPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/kanban', component: BoardPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/lixeira', component: TrashPage }),
  createRoute({ getParentRoute: () => rootRoute, path: '/perfil', component: ProfilePage }),
]);
export const router = createRouter({ routeTree, defaultPreload: 'intent', scrollRestoration: true });
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const root = document.getElementById('root');
if (!root) throw new Error('Elemento root não encontrado.');
createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider locale="pt-BR">
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
);
