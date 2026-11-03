import { Key } from 'lucide-react';
import { useId, useState } from 'react';
import type { AccessToken } from '#auth';
import { MAX_ACTIVE_ACCESS_TOKENS } from '#auth/domain';
import { Button, ErrorNotice, Spinner } from '../../ui';
import { useAccessTokens } from './access-tokens';
import { createdLabel, lastUseLabel } from './format';
import { NewAccessTokenDialog } from './NewAccessTokenDialog';
import { ProfileSection } from './ProfileSection';
import { RevokeAccessTokenDialog } from './RevokeAccessTokenDialog';

/** Personal read-only tokens for Claude Code: the list without secrets, Gerar token and Revogar. */
export function AccessTokensSection() {
  const tokens = useAccessTokens();
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<AccessToken | null>(null);
  const generateId = useId();
  const limitHint = useId();
  const atLimit = (tokens.data?.length ?? 0) >= MAX_ACTIVE_ACCESS_TOKENS;
  return (
    <ProfileSection
      id="profile-access"
      label="Acesso pelo Claude Code"
      description="Tokens pessoais somente leitura para o Claude Code consultar projetos, documentos, desenhos e tarefas. Itens na lixeira ficam de fora."
    >
      {tokens.isPending ? (
        <Spinner />
      ) : tokens.error ? (
        <ErrorNotice error={tokens.error} retry={() => void tokens.refetch()} />
      ) : tokens.data.length === 0 ? (
        <p className="profile-empty">Nenhum token. Gere um para conectar o Claude Code.</p>
      ) : (
        <ul className="profile-list" aria-label="Tokens ativos">
          {tokens.data.map((token) => (
            <AccessTokenRow key={token.id} token={token} onRevoke={() => setRevoking(token)} />
          ))}
        </ul>
      )}
      <div>
        <Button
          id={generateId}
          variant="primary"
          icon={<Key size={16} />}
          isDisabled={atLimit}
          {...(atLimit ? { 'aria-describedby': limitHint } : {})}
          onPress={() => setCreating(true)}
        >
          Gerar token
        </Button>
        {atLimit && (
          <p id={limitHint} className="profile-hint">
            Limite de {MAX_ACTIVE_ACCESS_TOKENS} tokens. Revogue um para gerar outro.
          </p>
        )}
      </div>
      {creating && <NewAccessTokenDialog onClose={() => setCreating(false)} />}
      {revoking && (
        <RevokeAccessTokenDialog
          token={revoking}
          onClose={() => setRevoking(null)}
          onRevoked={() => {
            setRevoking(null);
            // The revoked row is gone, so focus moves to the next action once the dialog closes.
            requestAnimationFrame(() => document.getElementById(generateId)?.focus());
          }}
        />
      )}
    </ProfileSection>
  );
}

function AccessTokenRow({ token, onRevoke }: { token: AccessToken; onRevoke: () => void }) {
  return (
    <li className="profile-row">
      <Key size={16} aria-hidden="true" />
      <span className="profile-row__text">
        <span className="profile-row__title">{token.name}</span>
        <span className="profile-row__meta">
          <code className="profile-mono">{token.prefix}…</code>
          <span>{createdLabel(token.createdAt)}</span>
          <span>{lastUseLabel(token.lastUsedAt)}</span>
        </span>
      </span>
      <Button
        size="sm"
        variant="ghost-danger"
        aria-label={`Revogar ${token.name} (${token.prefix}…)`}
        onPress={onRevoke}
      >
        Revogar
      </Button>
    </li>
  );
}
