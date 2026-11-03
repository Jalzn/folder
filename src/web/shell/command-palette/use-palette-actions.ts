import { useNavigate } from '@tanstack/react-router';
import type { Project } from '../../lib/types';
import { paths } from '../../navigation/paths';
import { useCommandRegistry } from '../commands/use-command-registry';
import { useProjectActions } from '../project/use-project-actions';
import { type SwitcherPlace, useShellActions } from '../shell-ui';
import type { PaletteAction } from './palette-sections';

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
  const ui = useShellActions();

  const navigate = useNavigate();
  const runCommand = useCommandRegistry({ project, switcherPlace, toggleSidebar });
  const projectActions = useProjectActions();

  const go = (href: string) => void navigate({ href });

  // A folder of another project shows once its project is on screen.
  function revealFolder(folderId: string, projectId: string) {
    const reveal = () => ui.revealFolder({ projectId, folderId });
    if (projectId === project?.id) reveal();
    else void navigate({ href: paths.overview(projectId) }).then(reveal);
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
