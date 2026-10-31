import { type FormEvent, useState } from 'react';
import { api, errorMessage, queryClient, reportSessionError } from '../../lib/api';
import { Button, TextField, useToast } from '../../ui';
import { ProfileSection } from './ProfileSection';
import { sessionsKey } from './SessionsSection';

/** Changing the password, which ends the sessions of the other devices. */
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
    <ProfileSection
      id="profile-password"
      label="Senha"
      description="Trocar a senha encerra as sessões dos outros dispositivos."
    >
      <form className="profile-form" onSubmit={changePassword}>
        <TextField
          label="Senha atual"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={setCurrentPassword}
          isRequired
          maxLength={256}
        />
        <TextField
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          description="Pelo menos 12 caracteres."
          value={newPassword}
          onChange={setNewPassword}
          isRequired
          minLength={12}
          maxLength={256}
        />
        {error && (
          <p className="profile-error" role="alert">
            {error}
          </p>
        )}
        <div className="profile-form__actions">
          <Button type="submit" isPending={busy}>
            Alterar senha
          </Button>
        </div>
      </form>
    </ProfileSection>
  );
}
