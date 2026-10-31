import { useQuery } from '@tanstack/react-query';
import { Check, Laptop, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { api, errorMessage, reportSessionError } from '../../lib/api';
import { ErrorNotice, Spinner, useToast } from '../../ui';

export const sessionsKey = ['sessions'];

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
    <section className="settings-section">
      <div className="settings-description">
        <h2>
          <Laptop size={18} />
          Dispositivos conectados
        </h2>
        <p>Continue suas ideias de onde estiver.</p>
      </div>
      <div>
        {sessions.isPending ? (
          <Spinner />
        ) : sessions.error ? (
          <ErrorNotice error={sessions.error} />
        ) : (
          <div className="session-list">
            {sessions.data?.map((session) => (
              <div className="session-row" key={session.id}>
                {/Android|iPhone|iPad/i.test(session.deviceLabel) ? <Smartphone size={22} /> : <Laptop size={22} />}
                <div>
                  <strong>{session.deviceLabel}</strong>
                  <span>
                    Último acesso:{' '}
                    {new Date(session.lastUsedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                {session.current ? (
                  <span className="current-session">
                    <Check size={13} />
                    Este dispositivo
                  </span>
                ) : (
                  <button
                    type="button"
                    className="text-button danger-text"
                    disabled={busy}
                    onClick={() => void revoke(session.id)}
                  >
                    Encerrar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {(sessions.data?.length ?? 0) > 1 && (
          <button type="button" className="button secondary" disabled={busy} onClick={() => void revoke()}>
            Encerrar outras sessões
          </button>
        )}
      </div>
    </section>
  );
}
