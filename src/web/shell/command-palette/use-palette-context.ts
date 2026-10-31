import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from '@tanstack/react-router';
import { parseProjectPath } from '../../router/paths';
import { activeProjects } from '../project/project-order';
import { useCurrentProject } from '../project/use-current-project';
import { useShellUi } from '../shell-ui';
import { useSidebarPrefs } from '../sidebar/use-sidebar-prefs';
import { useTheme } from '../theme';
import type { CommandContext } from './commands';

/** What the palette needs to know about the screen behind it. */
export function usePaletteContext() {
  const { project, projects } = useCurrentProject();
  const ui = useShellUi();
  const theme = useTheme();
  const prefs = useSidebarPrefs();
  const queryClient = useQueryClient();
  const pathname = useLocation({ select: (location) => location.pathname });
  const item = parseProjectPath(pathname)?.item ?? null;
  const pinned = item
    ? Boolean(
        queryClient.getQueryData<{ pinnedAt: string | null }>([
          'workspace',
          item.type === 'document' ? 'document' : 'canvas',
          item.id,
        ])?.pinnedAt,
      )
    : false;
  const context: CommandContext = {
    project: project ? { name: project.name, archived: Boolean(project.archivedAt) } : null,
    hasActiveProject: activeProjects(projects).length > 0,
    theme: theme.choice,
    sidebarCollapsed: prefs.collapsed,
    canSave: Boolean(ui.page.current.saveNow),
  };
  return { context, project, projects, item, pinned };
}
