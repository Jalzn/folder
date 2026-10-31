import { createRouter } from '@tanstack/react-router';
import { RouteNotFound } from '../pages/project/NotFoundPage';
import { RouteError } from '../pages/RouteError';
import { routeTree } from './routes';

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultNotFoundComponent: RouteNotFound,
  defaultErrorComponent: RouteError,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
