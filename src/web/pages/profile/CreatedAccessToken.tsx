import { Copy } from 'lucide-react';
import { type RefObject, useId, useRef, useState } from 'react';
import { copyText, selectContents } from '../../lib/clipboard';
import { mcpAddCommand } from '../../lib/mcp-command';
import { Button, DialogActions } from '../../ui';

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
    <div className="created-token">
      <p className="created-token__lead">Copie agora. Por segurança, ele não será mostrado de novo.</p>
      <div className="text-field">
        <label className="text-field__label" htmlFor={tokenId}>
          Token
        </label>
        <div className="created-token__copy">
          <input
            id={tokenId}
            ref={tokenField}
            className="input profile-mono"
            value={token}
            readOnly
            // biome-ignore lint/a11y/noAutofocus: The new secret takes the focus, selected, ready to copy.
            autoFocus
            spellCheck={false}
            onFocus={(event) => event.currentTarget.select()}
          />
          <Button icon={<Copy size={16} />} onPress={() => void copy(token, tokenField, 'Token copiado.')}>
            Copiar token
          </Button>
        </div>
      </div>
      <figure className="created-token__command">
        <figcaption className="text-field__label">Comando para o Claude Code</figcaption>
        <pre ref={commandBlock} className="profile-mono">
          <code>{command}</code>
        </pre>
      </figure>
      <div>
        <Button icon={<Copy size={16} />} onPress={() => void copy(command, commandBlock, 'Comando copiado.')}>
          Copiar comando
        </Button>
        <p className="profile-hint">
          O Claude Code guarda o cabeçalho na configuração local. Para o token não ficar no histórico do terminal,
          comece o comando com um espaço.
        </p>
      </div>
      <p className="created-token__status" role="status">
        {status}
      </p>
      <DialogActions>
        <Button variant="primary" onPress={onDone}>
          Concluir
        </Button>
      </DialogActions>
    </div>
  );
}
