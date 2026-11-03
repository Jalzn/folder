import { type FormEvent, useRef, useState } from 'react';
import { DEFAULT_ACCESS_TOKEN_NAME } from '#auth/domain';
import { api, errorMessage } from '../../lib/api';
import { Button, Dialog, DialogActions, TextField } from '../../ui';
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
      setError(errorMessage(e));
      submitting.current = false;
      setBusy(false);
    } finally {
      // A token created after the dialog closed still shows up in the list, ready to revoke.
      void reloadAccessTokens();
    }
  }
  return (
    <form className="profile-form" onSubmit={create}>
      <TextField
        label="Nome"
        description="Ajuda a reconhecer onde o token é usado"
        autoFocus
        value={name}
        onChange={setName}
        isRequired
        maxLength={100}
        // A label for the token, not a person's name or a credential: no autofill or password managers.
        autoComplete="off"
        inputProps={{
          'data-1p-ignore': true,
          'data-lpignore': 'true',
          'data-bwignore': true,
          'data-form-type': 'other',
        }}
      />
      {error && (
        <p className="profile-error" role="alert">
          {error}
        </p>
      )}
      <DialogActions>
        <Button onPress={onCancel}>Cancelar</Button>
        <Button type="submit" variant="primary" isPending={busy}>
          Gerar
        </Button>
      </DialogActions>
    </form>
  );
}
