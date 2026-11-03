import type { ReactNode } from 'react';
import type { LayerStack } from '../keyboard/layers';

/** Where the project switcher opens: the sidebar, the rail, the narrow top bar or the sidebar over the page. */
export type SwitcherPlace = 'sidebar' | 'rail' | 'top-bar' | 'overlay';

/** An action of the open item that the palette lists under "Neste item". */
export interface PageAction {
  id: string;
  label: string;
  icon?: ReactNode;
  run: () => void;
}

/**
 * What the page offers the shell: ⌘S, and for the palette's "Neste item" the item's file actions (export,
 * import) and moving it to the trash. Fixar and Mover para projeto… come from the shell itself.
 */
export interface PageCommands {
  saveNow?: () => void;
  files?: PageAction[] | undefined;
  trash?: (() => void) | undefined;
  /** The board's column in focus, where N's "Tarefa" creates, read when N is pressed. */
  newTaskColumn?: (() => string | undefined) | undefined;
  /** ⌘⌥T: a task from the excerpt selected in the page's editor; only a document's page offers it. */
  createTask?: (() => void) | undefined;
}

/** A folder being named in the sidebar, before it exists: from "+", N, ⌘K or "Mover para pasta…". */
export interface FolderDraft {
  projectId: string;
}

/** A created folder, as the sidebar hands it over. */
export interface CreatedFolder {
  id: string;
  name: string;
}

/** A folder to show in the sidebar, from ⌘K's Pastas: it opens there and its first item takes the focus. */
export interface FolderReveal {
  projectId: string;
  folderId: string;
}

/** What the shell's parts ask of it. These never change, so a part that only asks never re-renders for it. */
export interface ShellActions {
  layers: LayerStack;
  setOverlay: (open: boolean, options?: { search?: boolean }) => void;
  setSwitcherAt: (place: SwitcherPlace | null) => void;
  openPalette: (text?: string) => void;
  closePalette: () => void;
  setShortcutsOpen: (open: boolean) => void;
  /** Opens or closes N's menu; its "Tarefa" creates in `taskColumnId` when given. */
  setNewItemOpen: (open: boolean, taskColumnId?: string) => void;
  setMoveOpen: (open: false | 'folder' | 'project') => void;
  /** Asks the sidebar's Buscar for the focus. */
  requestSearch: () => void;
  announce: (text: string) => void;
  page: { current: PageCommands };
  /** Names a folder in the sidebar; `onCreated` follows its creation, as moving an item into it. */
  startFolder: (draft: FolderDraft & { onCreated?: ((folder: CreatedFolder) => void) | undefined }) => void;
  /**
   * Ends the draft, with the folder when it was created: true when the one who started it took it, false when
   * the sidebar should say it was created.
   */
  endFolder: (created?: CreatedFolder) => boolean;
  revealFolder: (reveal: FolderReveal | null) => void;
  setTopBarActions: (element: HTMLElement | null) => void;
  /** The board's label filter of a project, for this tab only (decision 17). */
  setLabelFilter: (projectId: string, labelIds: readonly string[]) => void;
  /** Opens "Gerenciar etiquetas…", from the board, its filter or ⌘K. */
  setLabelsOpen: (open: boolean) => void;
}

/** What the shell shows open now. */
export interface ShellState {
  overlay: { open: boolean; search: boolean };
  switcherAt: SwitcherPlace | null;
  /** The palette's text while it is open, or null. */
  palette: string | null;
  shortcutsOpen: boolean;
  newItemOpen: boolean;
  /** The column N's "Tarefa" creates in, as the board's column in focus when N was pressed. */
  newTaskColumn: string | null;
  /** The open item's move menu: "Mover para pasta…" (M), "Mover para projeto…", or closed. */
  moveOpen: false | 'folder' | 'project';
  /** Grows by one at each request to focus the sidebar's Buscar. */
  searchRequest: number;
  /** The folder being named in the sidebar, which opens the sidebar when it is hidden. */
  folderDraft: FolderDraft | null;
  /** The folder the sidebar shows next, which opens the sidebar when it is hidden; cleared once shown. */
  folderReveal: FolderReveal | null;
  /**
   * Below 720 px, the place in the top bar where the page's actions go, so there is one 44 px bar. It is state,
   * not a ref, because the page's actions portal into it once it exists.
   */
  topBarActions: HTMLElement | null;
  /** The label filter of each project's board in this tab: tasks with all of them show. */
  labelFilters: Readonly<Record<string, readonly string[]>>;
  labelsOpen: boolean;
}
