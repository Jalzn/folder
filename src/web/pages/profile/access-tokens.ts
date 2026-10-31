import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api, queryClient } from '../../lib/api';

const accessTokensKey = ['access-tokens'];

/**
 * The token list without secrets. The secret of a new token never enters this cache: creation
 * calls the API directly and keeps the answer only in the dialog.
 */
export function useAccessTokens() {
  const tokens = useQuery({
    queryKey: accessTokensKey,
    queryFn: () => api.auth.listAccessTokens(),
    // The window listener below also covers coming back from the terminal, not only from another tab.
    refetchOnWindowFocus: false,
  });
  const { refetch } = tokens;
  useEffect(() => {
    // The last use changes while the owner works in Claude Code.
    const reload = () => void refetch();
    window.addEventListener('focus', reload);
    return () => window.removeEventListener('focus', reload);
  }, [refetch]);
  return tokens;
}

export const reloadAccessTokens = () => queryClient.invalidateQueries({ queryKey: accessTokensKey });
