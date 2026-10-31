import { DEFAULT_ACCESS_TOKEN_NAME } from '@tinyfold/auth/domain';
import { type FormEvent, useRef, useState } from 'react';
import { api, errorMessage, reportSessionError } from '../../lib/api';
import { Dialog } from '../../ui';
import { reloadAccessTokens } from './access-tokens';
import { CreatedAccessToken } from './CreatedAccessToken';

/**
 * Names and creates a token, then shows its secret once. The secret lives only in this component:
 * the parent unmounts the dialog on close, which discards it.
 */
export function NewAccessTokenDialog({ onClose }: { onClose: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const close = () => {
    void reloadAccessTokens();
    onClose();
  };
  return (
    <Dialog
      title={token ? 'Token gerado' : 'Novo token'}
      open
      onClose={close}
      className="access-token-dialog"
      closeOnOutsideClick={!token}
    >
      {token ? (
        <CreatedAccessToken token={token} onDone={close} />
      ) : (
        <NewAccessTokenForm onCreated={setToken} onCancel={close} />
      )}
    </Dialog>
  );
}

function NewAccessTokenForm({ onCreated, onCancel }: { onCreated: (token: string) => void; onCancel: () => void }) {
  const [name, setName] = useState(DEFAULT_ACCESS_TOKEN_NAME);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  async function create(event: FormEvent) {
    event.preventDefault();
    // Creation is not idempotent: exactly one request per submission, never retried.
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const created = await api.auth.createAccessToken({ name });
      onCreated(created.token);
    } catch (e) {
      reportSessionError(e);
      setError(errorMessage(e));
      submitting.current = false;
      setBusy(false);
    } finally {
      // A token created after the dialog closed still shows up in the list, ready to revoke.
      void reloadAccessTokens();
    }
  }
  return (
    <form onSubmit={create}>
      <label className="field">
        Nome
        <input
          // biome-ignore lint/a11y/noAutofocus: Opening the dialog moves focus to its only field.
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={100}
        />
        <span className="field-hint">Ajuda a reconhecer onde o token é usado</span>
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button type="button" className="button secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="button primary" disabled={busy}>
          {busy ? 'Gerando…' : 'Gerar'}
        </button>
      </div>
    </form>
  );
}
