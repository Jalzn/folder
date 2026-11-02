import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { RouterClient } from '@orpc/server';
import { QueryClient } from '@tanstack/react-query';
import type { AppRouter } from '@tinyfold/server/router';
import { isSessionError } from './errors';
import { keys } from './queries/keys';
import { sessionExpired } from './session-events';

export { errorCode, errorMessage, isSessionError } from './errors';

/**
 * Tells the app the session ended, for a failure that says so. The link below already did, for every 401:
 * this only repeats it, and goes once the features drop their calls (WF-6).
 */
export function reportSessionError(error: unknown) {
  if (isSessionError(error)) sessionExpired();
}

const link = new RPCLink({
  url: new URL('/rpc', window.location.origin).href,
  fetch: async (request, init) => {
    const response = await fetch(request, {
      ...init,
      credentials: 'same-origin',
      signal: AbortSignal.any([AbortSignal.timeout(20_000), ...(request.signal ? [request.signal] : [])]),
    });
    // The one place that finds the session ended: the server answers every UNAUTHENTICATED with a 401.
    if (response.status === 401) sessionExpired();
    return response;
  },
});

export const api: RouterClient<AppRouter> = createORPCClient(link);
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10_000, refetchOnWindowFocus: true, retry: false },
  },
});
export const requestId = () => crypto.randomUUID();
export const refreshWorkspace = () => queryClient.invalidateQueries({ queryKey: keys.all });
