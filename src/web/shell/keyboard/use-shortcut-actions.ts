import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from '@tanstack/react-router';
import type { Project } from '../../lib/types';
import { parseProjectPath, paths } from '../../router/paths';
import { useToast } from '../../ui';
import { useApp } from '../AppProvider';
import { activeProjects } from '../project/project-order';
import { noProjectText } from '../project/switcher-label';
import { usePins } from '../project/use-pins';
import { type SwitcherPlace, useShellUi } from '../shell-ui';
import type { ChordCommand } from './chords';

export interface ShortcutLayout {
  project: Project | null;
  projects: Project[];
  /** Where the switcher opens on this layout. */
  switcherPlace: SwitcherPlace;
  /** The full sidebar shows, so `/` can focus its Buscar in place. */
  sidebarShown: boolean;
  toggleSidebar: () => void;
}

/** Moves focus between the shell's regions: the sidebar (or rail or top bar) and the page. */
function cycleRegions(backwards: boolean) {
  const regions = [...document.querySelectorAll<HTMLElement>('[data-region]')].filter(
    (region) => region.offsetParent !== null || region.tagName === 'MAIN',
  );
  if (!regions.length) return;
  const index = regions.findIndex((region) => region.contains(document.activeElement));
  const next = regions[(index + (backwards ? -1 : 1) + regions.length) % regions.length];
  const target =
    next?.querySelector<HTMLElement>('[data-roving][tabindex="0"]') ??
    next?.querySelector<HTMLElement>('h1[tabindex="-1"]') ??
    next?.querySelector<HTMLElement>('button, a[href], input') ??
    next;
  target?.focus();
}

/** What each shortcut does, with the rules for a missing or archived project. */
export function useShortcutActions(layout: ShortcutLayout) {
  const ui = useShellUi();
  const app = useApp();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const pins = usePins();
  const pathname = useLocation({ select: (location) => location.pathname });
  const { project } = layout;
  const go = (href: string) => void navigate({ href });
  const item = parseProjectPath(pathname)?.item ?? null;

  function chord(command: ChordCommand) {
    if (command.kind === 'switcher') return ui.setSwitcherAt(layout.switcherPlace);
    if (command.kind === 'project') {
      const target = activeProjects(layout.projects)[command.index];
      if (target) go(paths.overview(target.id));
      else if (!activeProjects(layout.projects).length) ui.announce(noProjectText(layout.projects));
      return;
    }
    if (!project) return ui.announce(noProjectText(layout.projects));
    if (command.kind === 'overview') go(paths.overview(project.id));
    else if (command.kind === 'board') go(paths.board(project.id));
    else go(paths.trash(project.id));
  }
  function newItem() {
    if (!project || !activeProjects(layout.projects).length) return app.openProjectDialog();
    if (project.archivedAt) return toast('Projeto arquivado: desarquive para criar itens.', 'error');
    ui.setNewItemOpen(true);
  }
  function search() {
    if (!project) return ui.openPalette();
    if (layout.sidebarShown) ui.requestSearch();
    else ui.setOverlay(true, { search: true });
  }
  function pinCurrent() {
    if (!project) return ui.announce(noProjectText(layout.projects));
    if (!item) return;
    const cached = queryClient.getQueryData<{ pinnedAt: string | null }>([
      'workspace',
      item.type === 'document' ? 'document' : 'canvas',
      item.id,
    ]);
    if (cached?.pinnedAt) void pins.unpin(item.type, item.id);
    else void pins.pin(item.type, item.id);
  }
  function moveCurrent() {
    if (!project) return ui.announce(noProjectText(layout.projects));
    if (item) ui.setMoveOpen(true);
  }
  return {
    palette: () => ui.openPalette(),
    toggleSidebar: layout.toggleSidebar,
    /** ⌘S belongs to the document and drawing pages only. */
    saveNow: () => {
      const save = ui.page.current.saveNow;
      save?.();
      return Boolean(save);
    },
    back: () => window.history.back(),
    cycleRegions,
    chord,
    search,
    newItem,
    pinCurrent,
    moveCurrent,
    shortcuts: () => ui.setShortcutsOpen(true),
  };
}
