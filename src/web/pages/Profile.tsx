import { useQuery } from '@tanstack/react-query';
import { Check, KeyRound, Laptop, LogOut, ShieldCheck, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { api, errorMessage, queryClient, reportSessionError } from '../lib/api';
import { useApp } from '../shell';
import { ErrorNotice, Spinner, useToast } from '../ui';
import { PageHeader } from './Library';

export function ProfilePage() {
  const app = useApp();
  const sessions = useQuery({ queryKey: ['sessions'], queryFn: () => api.auth.listSessions() });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.auth.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      toast('Senha alterada. As outras sessões foram encerradas.');
      await sessions.refetch();
    } catch (e) {
      reportSessionError(e);
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
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
  async function logout() {
    setBusy(true);
    try {
      await api.auth.logout();
      queryClient.removeQueries({ queryKey: ['workspace'] });
      window.dispatchEvent(new Event('tinyfold:logout'));
    } catch (e) {
      reportSessionError(e);
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page profile-page">
      <PageHeader eyebrow="MEU ESPAÇO" title="Perfil" description="Seu espaço, seus dispositivos." />
      <div className="profile-owner">
        <span className="avatar large">{app.owner.name.slice(0, 1).toUpperCase()}</span>
        <div>
          <h2>{app.owner.name}</h2>
          <p>Espaço pessoal</p>
        </div>
        <span className="profile-owner-badge">
          <ShieldCheck size={15} />
          Acesso privado
        </span>
      </div>
      <section className="settings-section">
        <div className="settings-description">
          <h2>
            <KeyRound size={18} />
            Sua senha
          </h2>
          <p>Trocar a senha encerra as sessões dos outros dispositivos.</p>
        </div>
        <form onSubmit={changePassword}>
          <label className="field">
            Senha atual
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              maxLength={256}
            />
          </label>
          <label className="field">
            Nova senha
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={12}
              maxLength={256}
            />
            <span className="field-hint">Pelo menos 12 caracteres.</span>
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="button secondary" disabled={busy}>
            Alterar senha
          </button>
        </form>
      </section>
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
      <div className="profile-logout">
        <button type="button" className="button secondary" disabled={busy} onClick={() => void logout()}>
          <LogOut size={16} />
          Sair deste dispositivo
        </button>
      </div>
    </div>
  );
}
