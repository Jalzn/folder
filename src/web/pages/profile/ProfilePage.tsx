import './profile.css';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { api, errorMessage, queryClient, reportSessionError } from '../../lib/api';
import { PageFrame } from '../../shell';
import { Button, PageHeader, useToast } from '../../ui';
import { AccessTokensSection } from './AccessTokensSection';
import { AppearanceSection } from './AppearanceSection';
import { PasswordSection } from './PasswordSection';
import { ProfileSection } from './ProfileSection';
import { SessionsSection } from './SessionsSection';
import { TimeZoneSection } from './TimeZoneSection';

/**
 * `/perfil`: the stage 07 settings in the 720 px column, with section labels and hairlines. Aparência,
 * Acesso pelo Claude Code, Dispositivos conectados, Senha and Sair.
 */
export function ProfilePage() {
  return (
    <PageFrame>
      <div className="profile-page">
        <PageHeader title="Perfil e token" description="Seu espaço, seus dispositivos." />
        <hr className="profile-page__hair" />
        <AppearanceSection />
        <TimeZoneSection />
        <AccessTokensSection />
        <SessionsSection />
        <PasswordSection />
        <LogoutSection />
      </div>
    </PageFrame>
  );
}

function LogoutSection() {
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
    <ProfileSection id="profile-logout" label="Sair">
      <div>
        <Button icon={<LogOut size={16} />} isPending={busy} onPress={() => void logout()}>
          Sair deste dispositivo
        </Button>
      </div>
    </ProfileSection>
  );
}
