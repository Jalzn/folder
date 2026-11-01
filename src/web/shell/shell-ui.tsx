import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createLayerStack, type LayerStack } from './keyboard/layers';

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
}

/** A folder being named in the sidebar, before it exists: from "+", N, ⌘K or "Mover para pasta…". */
export interface FolderDraft {
  projectId: string;
  /** After the folder is created, as moving an item into it; without it, a toast says it was created. */
  onCreated?: ((folder: { id: string; name: string }) => void) | undefined;
}

/** A folder to show in the sidebar, from ⌘K's Pastas: it opens there and its first item takes the focus. */
export interface FolderReveal {
  projectId: string;
  folderId: string;
}

interface ShellUi {
  layers: LayerStack;
  overlay: { open: boolean; search: boolean };
  setOverlay: (open: boolean, options?: { search?: boolean }) => void;
  switcherAt: SwitcherPlace | null;
  setSwitcherAt: (place: SwitcherPlace | null) => void;
  /** The palette's text while it is open, or null. */
  palette: string | null;
  openPalette: (text?: string) => void;
  closePalette: () => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
  newItemOpen: boolean;
  setNewItemOpen: (open: boolean) => void;
  /** The open item's move menu: "Mover para pasta…" (M), "Mover para projeto…", or closed. */
  moveOpen: false | 'folder' | 'project';
  setMoveOpen: (open: false | 'folder' | 'project') => void;
  /** Grows by one at each request to focus the sidebar's Buscar. */
  searchRequest: number;
  requestSearch: () => void;
  announcement: string;
  announce: (text: string) => void;
  page: { current: PageCommands };
  /** The folder being named in the sidebar, which opens the sidebar when it is hidden. */
  folderDraft: FolderDraft | null;
  startFolder: (draft: FolderDraft) => void;
  endFolder: () => void;
  /** The folder the sidebar shows next, which opens the sidebar when it is hidden; cleared once shown. */
  folderReveal: FolderReveal | null;
  revealFolder: (reveal: FolderReveal | null) => void;
  /** Below 720 px, the place in the top bar where the page's actions go, so there is one 44 px bar. */
  topBarActions: HTMLElement | null;
  setTopBarActions: (element: HTMLElement | null) => void;
}

const ShellUiContext = createContext<ShellUi | null>(null);

export function useShellUi() {
  const value = useContext(ShellUiContext);
  if (!value) throw new Error('A interface do shell está indisponível.');
  return value;
}

/** The shell's open layers and requests, shared by the sidebar, the shortcuts and the palette. */
export function ShellUiProvider({ children }: { children: ReactNode }) {
  const [layers] = useState(createLayerStack);
  const [overlay, setOverlayState] = useState({ open: false, search: false });
  const [switcherAt, setSwitcherAt] = useState<SwitcherPlace | null>(null);
  const [palette, setPalette] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState<false | 'folder' | 'project'>(false);
  const [searchRequest, setSearchRequest] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [folderDraft, setFolderDraft] = useState<FolderDraft | null>(null);
  const [folderReveal, revealFolder] = useState<FolderReveal | null>(null);
  const page = useRef<PageCommands>({});
  const setOverlay = useCallback(
    (open: boolean, options: { search?: boolean } = {}) =>
      setOverlayState({ open, search: open && Boolean(options.search) }),
    [],
  );
  const [topBarActions, setTopBarActions] = useState<HTMLElement | null>(null);
  const announce = useCallback((text: string) => {
    // A repeated message must still be read: clear first, then set.
    setAnnouncement('');
    requestAnimationFrame(() => setAnnouncement(text));
  }, []);
  const value = useMemo<ShellUi>(
    () => ({
      layers,
      overlay,
      setOverlay,
      switcherAt,
      setSwitcherAt,
      palette,
      openPalette: (text = '') => setPalette(text),
      closePalette: () => setPalette(null),
      shortcutsOpen,
      setShortcutsOpen,
      newItemOpen,
      setNewItemOpen,
      moveOpen,
      setMoveOpen,
      searchRequest,
      requestSearch: () => setSearchRequest((count) => count + 1),
      announcement,
      announce,
      page,
      folderDraft,
      startFolder: setFolderDraft,
      endFolder: () => setFolderDraft(null),
      folderReveal,
      revealFolder,
      topBarActions,
      setTopBarActions,
    }),
    [
      layers,
      overlay,
      setOverlay,
      switcherAt,
      palette,
      shortcutsOpen,
      newItemOpen,
      moveOpen,
      searchRequest,
      announcement,
      announce,
      folderDraft,
      folderReveal,
      topBarActions,
    ],
  );
  return <ShellUiContext.Provider value={value}>{children}</ShellUiContext.Provider>;
}
