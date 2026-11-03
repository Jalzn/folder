import { useLocation, useNavigate } from '@tanstack/react-router';
import { isItemPinned } from '../../lib/queries';
import type { Project } from '../../lib/types';
import { parseProjectPath, paths } from '../../navigation/paths';
import { useToast, useUndoLatest } from '../../ui';
import { useApp } from '../AppProvider';
import { useCommandRegistry } from '../commands/use-command-registry';
import { activeProjects } from '../project/project-order';
import { noProjectText } from '../project/switcher-label';
import { usePins } from '../project/use-pins';
import { type SwitcherPlace, useShellActions } from '../shell-ui';
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
  const runCommand = useCommandRegistry(layout);
  const ui = useShellActions();
  const app = useApp();
  const navigate = useNavigate();
  const toast = useToast();
  const undo = useUndoLatest();
  const pins = usePins();
  const pathname = useLocation({ select: (location) => location.pathname });
  const { project } = layout;
  const go = (href: string) => void navigate({ href });
  const item = parseProjectPath(pathname)?.item ?? null;

  function chord(command: ChordCommand) {
    if (command.kind === 'switcher') return runCommand('switch-project');
    if (command.kind === 'project') {
      const target = activeProjects(layout.projects)[command.index];
      if (target) go(paths.overview(target.id));
      else if (!activeProjects(layout.projects).length) ui.announce(noProjectText(layout.projects));
      return;
    }
    if (!project) return ui.announce(noProjectText(layout.projects));
    runCommand(command.kind === 'overview' ? 'overview' : command.kind === 'board' ? 'board' : 'trash');
  }
  function newItem() {
    if (!project || !activeProjects(layout.projects).length) return app.openProjectDialog();
    if (project.archivedAt) return toast('Projeto arquivado: desarquive para criar itens.', 'error');
    // The board's column in focus is read now, before the menu takes the focus.
    ui.setNewItemOpen(true, ui.page.current.newTaskColumn?.());
  }
  function search() {
    if (!project) return ui.openPalette();
    if (layout.sidebarShown) ui.requestSearch();
    else ui.setOverlay(true, { search: true });
  }
  function pinCurrent() {
    if (!project) return ui.announce(noProjectText(layout.projects));
    if (!item) return;
    if (isItemPinned(item.type, item.id)) void pins.unpin(item.type, item.id);
    else void pins.pin(item.type, item.id);
  }
  function moveCurrent() {
    if (!project) return ui.announce(noProjectText(layout.projects));
    if (item) ui.setMoveOpen('folder');
  }
  return {
    palette: () => ui.openPalette(),
    toggleSidebar: () => runCommand('toggle-sidebar'),
    /** ⌘S belongs to the document and drawing pages only. */
    saveNow: () => {
      const save = ui.page.current.saveNow;
      if (save) runCommand('save');
      return Boolean(save);
    },
    /** ⌘⌥T belongs to the document's page only; false elsewhere, where the key stays with the browser. */
    createTask: () => {
      const create = ui.page.current.createTask;
      create?.();
      return Boolean(create);
    },
    back: () => runCommand('back'),
    cycleRegions,
    chord,
    search,
    newItem,
    pinCurrent,
    moveCurrent,
    shortcuts: () => runCommand('shortcuts'),
    /** ⌘Z: the undo of the toast on screen; false when there is none. */
    undo,
  };
}
