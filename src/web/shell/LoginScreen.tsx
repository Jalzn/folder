import { ArrowRight, LoaderCircle } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { api, errorCode, errorMessage } from '../lib/api';
import { Logo } from '../ui';

export interface Owner {
  name: string;
  installationId: string;
}

/** The password form: on the login screen, and in the dialog that renews an expired session. */
export function LoginForm({ expired = false, onSuccess }: { expired?: boolean; onSuccess: (owner: Owner) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.auth.login({ password });
      setPassword('');
      onSuccess(result.owner);
    } catch (e) {
      setError(errorCode(e) === 'UNAUTHENTICATED' ? 'Essa senha não está correta. Tente novamente.' : errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="login-form" onSubmit={submit}>
      {!expired && (
        <>
          <Logo />
          <div className="login-intro">
            <span className="eyebrow">SEU ESPAÇO PESSOAL</span>
            <h1>
              Ideias ganham
              <br />
              um lugar.
            </h1>
            <p>
              Escreva livremente.
              <br />
              Organize no seu tempo.
            </p>
          </div>
        </>
      )}
      {expired && <p className="muted">Seu rascunho está preservado. Entre novamente para continuar de onde parou.</p>}
      <label className="field">
        Sua senha
        <input
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          placeholder="Digite sua senha"
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary login-submit" disabled={busy} type="submit">
        {busy ? <LoaderCircle size={17} className="spin" /> : <ArrowRight size={17} />}{' '}
        {busy ? 'Entrando…' : 'Entrar no Tinyfold'}
      </button>
      {!expired && <p className="login-footnote">Um pouco de espaço para pensar melhor.</p>}
    </form>
  );
}

/** Signed out, at any address: the app continues there after the password. */
export function LoginScreen({ onSuccess }: { onSuccess: (owner: Owner) => void }) {
  return (
    <main className="login-page">
      <div className="login-art" aria-hidden="true">
        <div className="fold fold-one" />
        <div className="fold fold-two" />
        <div className="fold fold-three" />
        <span className="login-art-caption">PENSE. ESCREVA. FAÇA.</span>
      </div>
      <LoginForm onSuccess={onSuccess} />
    </main>
  );
}
