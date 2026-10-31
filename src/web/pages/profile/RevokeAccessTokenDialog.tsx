import type { AccessToken } from '@tinyfold/auth';
import { useState } from 'react';
import { api, errorMessage, reportSessionError } from '../../lib/api';
import { Dialog, useToast } from '../../ui';
import { reloadAccessTokens } from './access-tokens';

export function RevokeAccessTokenDialog({
  token,
  onClose,
  onRevoked,
}: {
  token: AccessToken;
  onClose: () => void;
  onRevoked: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function revoke() {
    setBusy(true);
    try {
      await api.auth.revokeAccessToken({ id: token.id });
      // Close only after the list has dropped the row, so focus never returns to a removed button.
      await reloadAccessTokens();
      toast('Token revogado.');
      onRevoked();
    } catch (e) {
      reportSessionError(e);
      toast(errorMessage(e), 'error');
      setBusy(false);
    }
  }
  return (
    <Dialog title={`Revogar “${token.name}”?`} open onClose={onClose}>
      <p className="muted">O Claude Code que usa este token perde o acesso na hora.</p>
      <div className="dialog-actions">
        <button type="button" className="button secondary" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="button danger" disabled={busy} onClick={() => void revoke()}>
          Revogar token
        </button>
      </div>
    </Dialog>
  );
}
