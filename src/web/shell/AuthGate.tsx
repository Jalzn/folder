import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';
import { api, errorCode, queryClient } from '../lib/api';
import { Dialog, ErrorNotice, Logo, Spinner } from '../ui';
import { LoginForm, LoginScreen, type Owner } from './LoginScreen';

const signedOut = (error: unknown) => ['UNAUTHENTICATED', 'UNAUTHORIZED'].includes(errorCode(error) ?? '');

/**
 * The session: the login screen while signed out, and, when the session expires mid-work, a dialog that
 * renews it over the page, so drafts and the open editor stay as they are.
 */
export function AuthGate({ children }: { children: (owner: Owner) => ReactNode }) {
  const session = useQuery({
    queryKey: ['session'],
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
  useEffect(() => {
    const expire = () => setExpired(true);
    const logout = () => {
      setOwner(null);
      setExpired(false);
      queryClient.clear();
      void queryClient.invalidateQueries({ queryKey: ['session'] });
    };
    window.addEventListener('tinyfold:session-expired', expire);
    window.addEventListener('tinyfold:logout', logout);
    return () => {
      window.removeEventListener('tinyfold:session-expired', expire);
      window.removeEventListener('tinyfold:logout', logout);
    };
  }, []);
  function signedIn(value: Owner) {
    setOwner(value);
    setExpired(false);
    void queryClient.invalidateQueries();
  }
  if (!owner && (session.isPending || (session.error && !signedOut(session.error) && !expired)))
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
