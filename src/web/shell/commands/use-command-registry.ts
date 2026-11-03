import { useNavigate } from '@tanstack/react-router';
import type { Project } from '../../lib/types';
import { paths } from '../../navigation/paths';
import { useApp } from '../AppProvider';
import type { CommandId } from '../command-palette/commands';
import { useCreateInProject } from '../project/use-create-in-project';
import { type SwitcherPlace, useShellActions } from '../shell-ui';
import { useSidebarPrefs } from '../sidebar/use-sidebar-prefs';
import { type ThemeChoice, useTheme } from '../theme';

const themes: Partial<Record<CommandId, ThemeChoice>> = {
  'theme-system': 'system',
  'theme-light': 'light',
  'theme-dark': 'dark',
};

/** The palette and keyboard dispatch the same shell commands. */
export function useCommandRegistry({
  project,
  switcherPlace,
  toggleSidebar,
}: {
  project: Project | null;
  switcherPlace: SwitcherPlace;
  toggleSidebar: () => void;
}) {
  const ui = useShellActions();
  const app = useApp();
  const navigate = useNavigate();
  const theme = useTheme();
  const prefs = useSidebarPrefs();
  const create = useCreateInProject(project, undefined);
  const go = (href: string) => void navigate({ href });
  function runCommand(id: CommandId) {
    const choice = themes[id];
    if (choice) {
      theme.choose(choice);
      return;
    }
    const current = project;
    const commands: Partial<Record<CommandId, () => void>> = {
      'new-document': () => create('document'),
      'new-drawing': () => create('drawing'),
      'new-folder': () => create('folder'),
      'new-task': () => create('task'),
      'switch-project': () => ui.setSwitcherAt(switcherPlace),
      overview: () => current && go(paths.overview(current.id)),
      board: () => current && go(paths.board(current.id)),
      index: () => current && go(paths.index(current.id)),
      trash: () => current && go(paths.trash(current.id)),
      completed: () => current && go(paths.completed(current.id)),
      labels: () => ui.setLabelsOpen(true),
      'collapse-folders': () => {
        if (!current) return;
        prefs.setProject(current.id, { expanded: [] });
        ui.announce('Pastas recolhidas.');
      },
      'toggle-sidebar': toggleSidebar,
      profile: () => go(paths.profile),
      'new-project': () => app.openProjectDialog(),
      shortcuts: () => ui.setShortcutsOpen(true),
      save: () => ui.page.current.saveNow?.(),
      back: () => window.history.back(),
    };
    commands[id]?.();
  }
  return runCommand;
}
