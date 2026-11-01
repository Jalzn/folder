import { createContext, type ReactNode, useContext, useMemo, useRef, useState } from 'react';
import { AnnouncerProvider, useAnnounce } from './announcer';
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
  setNewItemOpen: (open: boolean) => void;
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
}

/** What the shell shows open now. */
export interface ShellState {
  overlay: { open: boolean; search: boolean };
  switcherAt: SwitcherPlace | null;
  /** The palette's text while it is open, or null. */
  palette: string | null;
  shortcutsOpen: boolean;
  newItemOpen: boolean;
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
}

const ActionsContext = createContext<ShellActions | null>(null);
const StateContext = createContext<ShellState | null>(null);

/** The shell's actions, which never change: for the parts that only ask. */
export function useShellActions() {
  const value = useContext(ActionsContext);
  if (!value) throw new Error('A interface do shell está indisponível.');
  return value;
}

/** The shell's actions and what it shows open: re-renders when any of that changes. */
export function useShellUi(): ShellActions & ShellState {
  const actions = useShellActions();
  const state = useContext(StateContext);
  if (!state) throw new Error('A interface do shell está indisponível.');
  return { ...actions, ...state };
}

/** The shell's actions, or null outside it, as on the error page of a shell that failed. */
export const useOptionalShellUi = () => useContext(ActionsContext);

/** The shell's open layers and requests, shared by the sidebar, the shortcuts and the palette. */
export function ShellUiProvider({ children }: { children: ReactNode }) {
  return (
    <AnnouncerProvider>
      <ShellUiState>{children}</ShellUiState>
    </AnnouncerProvider>
  );
}

function ShellUiState({ children }: { children: ReactNode }) {
  const announce = useAnnounce();
  const [layers] = useState(createLayerStack);
  const [overlay, setOverlayState] = useState({ open: false, search: false });
  const [switcherAt, setSwitcherAt] = useState<SwitcherPlace | null>(null);
  const [palette, setPalette] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState<false | 'folder' | 'project'>(false);
  const [searchRequest, setSearchRequest] = useState(0);
  const [folderDraft, setFolderDraft] = useState<FolderDraft | null>(null);
  const [folderReveal, revealFolder] = useState<FolderReveal | null>(null);
  const [topBarActions, setTopBarActions] = useState<HTMLElement | null>(null);
  const page = useRef<PageCommands>({});
  // What follows a folder's creation is a callback, kept beside the draft rather than in its state.
  const draftCreated = useRef<((folder: CreatedFolder) => void) | undefined>(undefined);

  const actions = useMemo<ShellActions>(
    () => ({
      layers,
      setOverlay: (open, options = {}) => setOverlayState({ open, search: open && Boolean(options.search) }),
      setSwitcherAt,
      openPalette: (text = '') => setPalette(text),
      closePalette: () => setPalette(null),
      setShortcutsOpen,
      setNewItemOpen,
      setMoveOpen,
      requestSearch: () => setSearchRequest((count) => count + 1),
      announce,
      page,
      startFolder: ({ onCreated, ...draft }) => {
        draftCreated.current = onCreated;
        setFolderDraft(draft);
      },
      endFolder: (created) => {
        const then = draftCreated.current;
        draftCreated.current = undefined;
        setFolderDraft(null);
        if (!created || !then) return false;
        then(created);
        return true;
      },
      revealFolder,
      setTopBarActions,
    }),
    [layers, announce],
  );
  const state = useMemo<ShellState>(
    () => ({
      overlay,
      switcherAt,
      palette,
      shortcutsOpen,
      newItemOpen,
      moveOpen,
      searchRequest,
      folderDraft,
      folderReveal,
      topBarActions,
    }),
    [
      overlay,
      switcherAt,
      palette,
      shortcutsOpen,
      newItemOpen,
      moveOpen,
      searchRequest,
      folderDraft,
      folderReveal,
      topBarActions,
    ],
  );
  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </ActionsContext.Provider>
  );
}
