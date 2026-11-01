import { useNavigate } from '@tanstack/react-router';
import type { Project } from '../../lib/types';
import { paths } from '../../router/paths';
import { useApp } from '../AppProvider';
import { useProjectActions } from '../project/use-project-actions';
import { type SwitcherPlace, useShellUi } from '../shell-ui';
import { useSidebarPrefs } from '../sidebar/use-sidebar-prefs';
import { type ThemeChoice, useTheme } from '../theme';
import type { CommandId } from './commands';
import type { PaletteAction } from './palette-sections';

const themes: Partial<Record<CommandId, ThemeChoice>> = {
  'theme-system': 'system',
  'theme-light': 'light',
  'theme-dark': 'dark',
};

/** Runs what a palette row stands for: an item's action, an item, a project, a folder or a command. */
export function usePaletteActions({
  here,
  project,
  projects,
  switcherPlace,
  toggleSidebar,
}: {
  here: readonly { id: string; run: () => void }[];
  project: Project | null;
  projects: readonly Project[];
  switcherPlace: SwitcherPlace;
  toggleSidebar: () => void;
}) {
  const ui = useShellUi();
  const app = useApp();
  const navigate = useNavigate();
  const theme = useTheme();
  const projectActions = useProjectActions();
  const prefs = useSidebarPrefs();
  const go = (href: string) => void navigate({ href });

  // A folder of another project shows once its project is on screen.
  function revealFolder(folderId: string, projectId: string) {
    const reveal = () => ui.revealFolder({ projectId, folderId });
    if (projectId === project?.id) reveal();
    else void navigate({ href: paths.overview(projectId) }).then(reveal);
  }

  function runCommand(id: CommandId) {
    const choice = themes[id];
    if (choice) {
      theme.choose(choice);
      return;
    }
    const current = project;
    const commands: Partial<Record<CommandId, () => void>> = {
      'new-document': () => current && void app.newDocument(current.id),
      'new-drawing': () => current && void app.newCanvas(current.id),
      'new-folder': () => current && ui.startFolder({ projectId: current.id }),
      'new-task': () => current && app.newTask(current.id),
      'switch-project': () => ui.setSwitcherAt(switcherPlace),
      overview: () => current && go(paths.overview(current.id)),
      board: () => current && go(paths.board(current.id)),
      index: () => current && go(paths.index(current.id)),
      trash: () => current && go(paths.trash(current.id)),
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

  return function run(action: PaletteAction) {
    if (action.kind === 'here') here.find((entry) => entry.id === action.id)?.run();
    else if (action.kind === 'item')
      go(
        action.type === 'task'
          ? paths.task(action.projectId, action.id)
          : paths.item(action.projectId, action.type, action.id),
      );
    else if (action.kind === 'folder') revealFolder(action.id, action.projectId);
    else if (action.kind === 'project') {
      const entry = projects.find((candidate) => candidate.id === action.id);
      if (entry && action.unarchive) void projectActions.unarchive(entry, { open: true });
      else go(paths.overview(action.id));
    } else runCommand(action.id);
  };
}
