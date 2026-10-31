import type { AccessToken } from '@tinyfold/auth';
import { MAX_ACTIVE_ACCESS_TOKENS } from '@tinyfold/auth/domain';
import { Key, Terminal } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { ErrorNotice, Spinner } from '../../ui';
import { useAccessTokens } from './access-tokens';
import { createdLabel, lastUseLabel } from './format';
import { NewAccessTokenDialog } from './NewAccessTokenDialog';
import { RevokeAccessTokenDialog } from './RevokeAccessTokenDialog';

export function AccessTokensSection() {
  const tokens = useAccessTokens();
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<AccessToken | null>(null);
  const generateButton = useRef<HTMLButtonElement>(null);
  const limitHint = useId();
  const atLimit = (tokens.data?.length ?? 0) >= MAX_ACTIVE_ACCESS_TOKENS;
  return (
    <section className="settings-section">
      <div className="settings-description">
        <h2>
          <Terminal size={18} />
          Acesso pelo Claude Code
        </h2>
        <p>
          Tokens pessoais somente leitura para o Claude Code consultar projetos, documentos, desenhos e tarefas. Itens
          na lixeira ficam de fora.
        </p>
      </div>
      <div>
        {tokens.isPending ? (
          <Spinner />
        ) : tokens.error ? (
          <ErrorNotice error={tokens.error} retry={() => void tokens.refetch()} />
        ) : tokens.data.length === 0 ? (
          <p className="access-token-empty">Nenhum token. Gere um para conectar o Claude Code.</p>
        ) : (
          <ul className="session-list access-token-list" aria-label="Tokens ativos">
            {tokens.data.map((token) => (
              <AccessTokenRow key={token.id} token={token} onRevoke={() => setRevoking(token)} />
            ))}
          </ul>
        )}
        <button
          ref={generateButton}
          type="button"
          className="button secondary"
          disabled={atLimit}
          aria-describedby={atLimit ? limitHint : undefined}
          onClick={() => setCreating(true)}
        >
          Gerar token
        </button>
        {atLimit && (
          <p id={limitHint} className="field-hint access-token-limit">
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
            requestAnimationFrame(() => generateButton.current?.focus());
          }}
        />
      )}
    </section>
  );
}

function AccessTokenRow({ token, onRevoke }: { token: AccessToken; onRevoke: () => void }) {
  return (
    <li className="session-row">
      <Key size={20} />
      <div>
        <strong>{token.name}</strong>
        <span className="access-token-meta">
          <code className="access-token-prefix">{token.prefix}…</code>
          <span>{createdLabel(token.createdAt)}</span>
          <span>{lastUseLabel(token.lastUsedAt)}</span>
        </span>
      </div>
      <button
        type="button"
        className="text-button danger-text"
        aria-label={`Revogar ${token.name} (${token.prefix}…)`}
        onClick={onRevoke}
      >
        Revogar
      </button>
    </li>
  );
}
