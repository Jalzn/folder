import { useNavigate } from '@tanstack/react-router';
import { Keyboard, KeyRound, LogOut, Monitor, Moon, Sun, SunMoon } from 'lucide-react';
import { type ReactElement, useState } from 'react';
import { errorMessage } from '../../lib/api';
import { signOut } from '../../lib/session';
import { paths } from '../../router/paths';
import { AlertDialog, Menu, MenuItem, MenuSeparator, MenuTrigger, SubmenuTrigger, useToast } from '../../ui';
import { KEYS } from '../keyboard/keys';
import { useShellActions } from '../shell-ui';
import { THEME_CHOICES, type ThemeChoice, themeChoiceLabels, useTheme } from '../theme';

const themeIcons: Record<ThemeChoice, ReactElement> = {
  system: <Monitor size={16} />,
  light: <Sun size={16} />,
  dark: <Moon size={16} />,
};

/** The Você menu: Perfil e token, Tema (Sistema, Claro, Escuro), Atalhos and Sair, after a confirmation. */
export function YouMenu({
  trigger,
  placement = 'top start',
}: {
  trigger: ReactElement;
  placement?: 'top start' | 'right bottom';
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const theme = useTheme();
  const ui = useShellActions();
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try {
      await signOut();
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(false);
      setLeaving(false);
    }
  }
  return (
    <>
      <MenuTrigger>
        {trigger}
        <Menu aria-label="Você" placement={placement}>
          <MenuItem id="profile" icon={<KeyRound size={16} />} onAction={() => void navigate({ href: paths.profile })}>
            Perfil e token
          </MenuItem>
          <SubmenuTrigger>
            <MenuItem id="theme" icon={<SunMoon size={16} />} description={themeChoiceLabels[theme.choice]}>
              Tema
            </MenuItem>
            <Menu
              aria-label="Tema"
              placement="end top"
              selectionMode="single"
              selectedKeys={[theme.choice]}
              onAction={(key) => theme.choose(key as ThemeChoice)}
            >
              {THEME_CHOICES.map((choice) => (
                <MenuItem key={choice} id={choice} icon={themeIcons[choice]}>
                  {themeChoiceLabels[choice]}
                </MenuItem>
              ))}
            </Menu>
          </SubmenuTrigger>
          <MenuItem
            id="shortcuts"
            icon={<Keyboard size={16} />}
            shortcut={KEYS.shortcuts}
            onAction={() => ui.setShortcutsOpen(true)}
          >
            Atalhos
          </MenuItem>
          <MenuSeparator />
          <MenuItem id="logout" icon={<LogOut size={16} />} onAction={() => setLeaving(true)}>
            Sair
          </MenuItem>
        </Menu>
      </MenuTrigger>
      <AlertDialog
        title="Sair deste navegador?"
        open={leaving}
        onClose={() => setLeaving(false)}
        confirmLabel="Sair"
        destructive={false}
        isPending={busy}
        onConfirm={() => void logout()}
      >
        Os rascunhos guardados aqui continuam no navegador.
      </AlertDialog>
    </>
  );
}
