import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { RouterClient } from '@orpc/server';
import { QueryCache, QueryClient } from '@tanstack/react-query';
import type { AppRouter } from '@tinyfold/server/router';
import { errorCode } from './errors';
import { keys } from './queries/keys';

export { errorCode, errorMessage } from './errors';

export function reportSessionError(error: unknown) {
  if (['UNAUTHENTICATED', 'UNAUTHORIZED'].includes(errorCode(error) ?? '')) {
    window.dispatchEvent(new Event('tinyfold:session-expired'));
  }
}

const link = new RPCLink({
  url: new URL('/rpc', window.location.origin).href,
  fetch: async (request, init) => {
    const response = await fetch(request, {
      ...init,
      credentials: 'same-origin',
      signal: AbortSignal.any([AbortSignal.timeout(20_000), ...(request.signal ? [request.signal] : [])]),
    });
    if (response.status === 401) window.dispatchEvent(new Event('tinyfold:session-expired'));
    return response;
  },
});

export const api: RouterClient<AppRouter> = createORPCClient(link);
export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: reportSessionError }),
  defaultOptions: {
    queries: { staleTime: 10_000, refetchOnWindowFocus: true, retry: false },
  },
});
export const requestId = () => crypto.randomUUID();
export const refreshWorkspace = () => queryClient.invalidateQueries({ queryKey: keys.all });
