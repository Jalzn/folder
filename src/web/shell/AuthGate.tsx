import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';
import { api, isSessionError, queryClient } from '../lib/api';
import { keys } from '../lib/queries';
import { onSessionEvents } from '../lib/session-events';
import { Dialog, ErrorNotice, Logo, Spinner } from '../ui';
import { LoginForm, LoginScreen, type Owner } from './LoginScreen';

/**
 * The session: the login screen while signed out, and, when the session expires mid-work, a dialog that
 * renews it over the page, so drafts and the open editor stay as they are.
 */
export function AuthGate({ children }: { children: (owner: Owner) => ReactNode }) {
  const session = useQuery({
    queryKey: keys.session,
    queryFn: () => api.auth.session(),
    retry: false,
    staleTime: 60_000,
  });
  const [owner, setOwner] = useState<Owner | null>(null);
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (session.data) {
      setOwner(session.data.owner);
      setExpired(false);
    }
  }, [session.data]);
  useEffect(
    () =>
      onSessionEvents({
        expired: () => setExpired(true),
        signedOut: () => {
          setOwner(null);
          setExpired(false);
          queryClient.clear();
          void queryClient.invalidateQueries({ queryKey: keys.session });
        },
      }),
    [],
  );
  function signedIn(value: Owner) {
    setOwner(value);
    setExpired(false);
    void queryClient.invalidateQueries();
  }
  if (!owner && (session.isPending || (session.error && !isSessionError(session.error) && !expired)))
    return (
      <div className="auth-loading">
        <Logo />
        {session.isPending ? (
          <Spinner label="Abrindo seu espaço…" />
        ) : (
          <ErrorNotice error={session.error} retry={() => void session.refetch()} />
        )}
      </div>
    );
  if (!owner) return <LoginScreen onSuccess={signedIn} />;
  return (
    <>
      {children(owner)}
      <Dialog title="Vamos continuar?" open={expired} onClose={() => undefined} dismissable={false}>
        <LoginForm expired onSuccess={signedIn} />
      </Dialog>
    </>
  );
}
