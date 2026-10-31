import { useQuery } from '@tanstack/react-query';
import { Check, Laptop, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { api, errorMessage, reportSessionError } from '../../lib/api';
import { Button, ErrorNotice, Spinner, useToast } from '../../ui';
import { ProfileSection } from './ProfileSection';

export const sessionsKey = ['sessions'];

/** The devices signed in, this one marked; any other can be signed out, or all of them at once. */
export function SessionsSection() {
  const sessions = useQuery({ queryKey: sessionsKey, queryFn: () => api.auth.listSessions() });
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function revoke(sessionId?: string) {
    setBusy(true);
    try {
      if (sessionId) await api.auth.revokeSession({ sessionId });
      else await api.auth.revokeOtherSessions();
      await sessions.refetch();
      toast('Sessão encerrada.');
    } catch (e) {
      reportSessionError(e);
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <ProfileSection id="profile-sessions" label="Dispositivos conectados">
      {sessions.isPending ? (
        <Spinner />
      ) : sessions.error ? (
        <ErrorNotice error={sessions.error} />
      ) : (
        <ul className="profile-list" aria-label="Sessões">
          {sessions.data.map((session) => {
            const Icon = /Android|iPhone|iPad/i.test(session.deviceLabel) ? Smartphone : Laptop;
            return (
              <li className="profile-row" key={session.id}>
                <Icon size={16} aria-hidden="true" />
                <span className="profile-row__text">
                  <span className="profile-row__title">{session.deviceLabel}</span>
                  <span className="profile-row__meta">
                    Último acesso:{' '}
                    {new Date(session.lastUsedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </span>
                {session.current ? (
                  <span className="profile-row__current">
                    <Check size={14} aria-hidden="true" />
                    Este dispositivo
                  </span>
                ) : (
                  <Button size="sm" variant="ghost-danger" isDisabled={busy} onPress={() => void revoke(session.id)}>
                    Encerrar
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {(sessions.data?.length ?? 0) > 1 && (
        <div>
          <Button isDisabled={busy} onPress={() => void revoke()}>
            Encerrar outras sessões
          </Button>
        </div>
      )}
    </ProfileSection>
  );
}
