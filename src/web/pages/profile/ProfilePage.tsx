import './profile.css';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { api, errorMessage, queryClient, reportSessionError } from '../../lib/api';
import { useApp } from '../../shell';
import { useToast } from '../../ui';
import { PageHeader } from '../Library';
import { AccessTokensSection } from './AccessTokensSection';
import { PasswordSection } from './PasswordSection';
import { SessionsSection } from './SessionsSection';

export function ProfilePage() {
  const app = useApp();
  return (
    <div className="page profile-page">
      <PageHeader eyebrow="MEU ESPAÇO" title="Perfil" description="Seu espaço, seus dispositivos." />
      <div className="profile-owner">
        <span className="avatar large">{app.owner.name.slice(0, 1).toUpperCase()}</span>
        <div>
          <h2>{app.owner.name}</h2>
          <p>Espaço pessoal</p>
        </div>
        <span className="profile-owner-badge">
          <ShieldCheck size={15} />
          Acesso privado
        </span>
      </div>
      <PasswordSection />
      <SessionsSection />
      <AccessTokensSection />
      <LogoutButton />
    </div>
  );
}

function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function logout() {
    setBusy(true);
    try {
      await api.auth.logout();
      queryClient.removeQueries({ queryKey: ['workspace'] });
      window.dispatchEvent(new Event('tinyfold:logout'));
    } catch (e) {
      reportSessionError(e);
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="profile-logout">
      <button type="button" className="button secondary" disabled={busy} onClick={() => void logout()}>
        <LogOut size={16} />
        Sair deste dispositivo
      </button>
    </div>
  );
}
