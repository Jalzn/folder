import './login.css';
import { ArrowRight } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { api, errorCode, errorMessage } from '../lib/api';
import { Button, Logo, TextField } from '../ui';

export interface Owner {
  name: string;
  installationId: string;
  /** The owner's time zone, where every civil date counts; null until the first load sets it. */
  timeZone?: string | null;
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
      {expired && (
        <p className="login-form__lead">Seu rascunho está preservado. Entre novamente para continuar de onde parou.</p>
      )}
      <TextField
        label="Sua senha"
        type="password"
        name="password"
        autoComplete="current-password"
        placeholder="Digite sua senha"
        value={password}
        onChange={setPassword}
        isRequired
        errorMessage={error}
      />
      <Button
        type="submit"
        variant="primary"
        className="login-form__submit"
        isPending={busy}
        icon={<ArrowRight size={16} />}
      >
        Entrar no Tinyfold
      </Button>
    </form>
  );
}

/** Signed out, at any address: a card in the chosen theme. The app continues there after the password. */
export function LoginScreen({ onSuccess }: { onSuccess: (owner: Owner) => void }) {
  return (
    <main className="login-screen">
      <div className="login-card">
        <Logo />
        <h1 className="login-card__title">Seu espaço pessoal</h1>
        <p className="login-card__lead">Escreva livremente. Organize no seu tempo.</p>
        <LoginForm onSuccess={onSuccess} />
        <p className="login-card__foot">Um pouco de espaço para pensar melhor.</p>
      </div>
    </main>
  );
}
