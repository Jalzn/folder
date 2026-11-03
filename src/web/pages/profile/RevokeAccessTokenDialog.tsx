import { useState } from 'react';
import type { AccessToken } from '#auth';
import { api, errorMessage } from '../../lib/api';
import { AlertDialog, useToast } from '../../ui';
import { reloadAccessTokens } from './access-tokens';

/** "Revogar “Claude Code”?": the token stops working at once. */
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
      toast(errorMessage(e), 'error');
      setBusy(false);
    }
  }
  return (
    <AlertDialog
      open
      title={`Revogar “${token.name}”?`}
      confirmLabel="Revogar token"
      isPending={busy}
      onClose={onClose}
      onConfirm={() => void revoke()}
    >
      <p>O Claude Code que usa este token perde o acesso na hora.</p>
    </AlertDialog>
  );
}
