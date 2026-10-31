import { Copy } from 'lucide-react';
import { type RefObject, useId, useRef, useState } from 'react';
import { copyText, selectContents } from '../../lib/clipboard';
import { mcpAddCommand } from '../../lib/mcp-command';

/** The only time the secret is shown: the token, the Claude Code command and how to copy both. */
export function CreatedAccessToken({ token, onDone }: { token: string; onDone: () => void }) {
  const command = mcpAddCommand(window.location.origin, token);
  const tokenField = useRef<HTMLInputElement>(null);
  const commandBlock = useRef<HTMLPreElement>(null);
  const tokenId = useId();
  const [status, setStatus] = useState('');
  async function copy(text: string, source: RefObject<HTMLElement | null>, copied: string) {
    if (await copyText(text)) {
      setStatus(copied);
      return;
    }
    if (source.current) selectContents(source.current);
    setStatus('Selecione e copie manualmente.');
  }
  return (
    <>
      <p className="muted">Copie agora. Por segurança, ele não será mostrado de novo.</p>
      <div className="field">
        <label htmlFor={tokenId}>Token</label>
        <div className="access-token-copy">
          <input
            id={tokenId}
            ref={tokenField}
            className="access-token-secret"
            value={token}
            readOnly
            // biome-ignore lint/a11y/noAutofocus: The new secret takes the focus, selected, ready to copy.
            autoFocus
            spellCheck={false}
            onFocus={(event) => event.currentTarget.select()}
          />
          <button
            type="button"
            className="button secondary"
            onClick={() => void copy(token, tokenField, 'Token copiado.')}
          >
            <Copy size={15} />
            Copiar token
          </button>
        </div>
      </div>
      <div className="access-token-command">
        <figure>
          <figcaption>Comando para o Claude Code</figcaption>
          <pre ref={commandBlock}>
            <code>{command}</code>
          </pre>
        </figure>
        <button
          type="button"
          className="button secondary"
          onClick={() => void copy(command, commandBlock, 'Comando copiado.')}
        >
          <Copy size={15} />
          Copiar comando
        </button>
        <p className="field-hint">
          O Claude Code guarda o cabeçalho na configuração local. Para o token não ficar no histórico do terminal,
          comece o comando com um espaço.
        </p>
      </div>
      <p className="access-token-status" role="status">
        {status}
      </p>
      <div className="dialog-actions">
        <button type="button" className="button primary" onClick={onDone}>
          Concluir
        </button>
      </div>
    </>
  );
}
