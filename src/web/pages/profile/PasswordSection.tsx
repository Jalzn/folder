import { KeyRound } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { api, errorMessage, queryClient, reportSessionError } from '../../lib/api';
import { useToast } from '../../ui';
import { sessionsKey } from './SessionsSection';

export function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.auth.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      toast('Senha alterada. As outras sessões foram encerradas.');
      await queryClient.invalidateQueries({ queryKey: sessionsKey });
    } catch (e) {
      reportSessionError(e);
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
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
  );
}
