import { createContext, type ReactNode, useContext, useMemo, useRef, useState } from 'react';
import type { Task } from '../lib/types';
import { pageFocus, returnFocus } from '../ui';

/** Where a task created from a document's selection came from. */
export interface TaskOrigin {
  documentId: string;
  documentTitle?: string;
  blockId?: string | null;
  excerpt: string;
  expectedVersion?: number;
}

export interface NewTaskOptions {
  /** The column it goes to; without it, the first open column. */
  columnId?: string;
  source?: TaskOrigin;
  title?: string;
  /** Runs once the new task's drawer leaves, created or not. */
  onClose?: () => void;
  /** Runs once the task is created, as a document's "Nova tarefa…" puts its card in place. */
  onCreated?: (task: { id: string; projectId: string }) => void;
}

/** What the drawer shows: a task, by its id and project, or a new task with its starting values. */
export type DrawerContent =
  | { mode: 'task'; id: string; projectId: string; title: string }
  | ({ mode: 'new'; projectId: string; key: number } & NewTaskOptions);

type TaskRef = Pick<Task, 'id' | 'projectId' | 'title'>;

export interface TaskDrawerActions {
  /** Opens a task in the drawer, from the element that has the focus. */
  openTask: (task: TaskRef) => void;
  /** Opens the drawer on a new task of the project, in a column or from a document's selection. */
  newTask: (projectId: string, options?: NewTaskOptions) => void;
  /** The drawer passes to a task without changing who opened it, as after creating one or moving it. */
  showTask: (task: TaskRef) => void;
  /**
   * Closes the drawer and gives the focus back to what opened it. A new task with something typed asks first,
   * unless `force`.
   */
  close: (options?: { force?: boolean }) => void;
  /** A new task's question before closing: false when it asked, and the drawer stays. */
  setCloseGuard: (guard: (() => boolean) | null) => void;
  /** What opened the drawer, while it is still on the page. */
  opener: () => HTMLElement | null;
  /** What ⌘K's "Nesta tarefa" runs on the open task, which its editor keeps current; null without one. */
  taskCommands: { current: TaskCommands | null };
}

/** The open task's actions for ⌘K: Concluir or Reabrir, Mover para coluna…, Copiar link, the trash. */
export interface TaskCommands {
  done: boolean;
  toggleDone?: (() => void) | undefined;
  moveToColumn?: (() => void) | undefined;
  copyLink: () => void;
  trash?: (() => void) | undefined;
}

const ActionsContext = createContext<TaskDrawerActions | null>(null);
const ContentContext = createContext<DrawerContent | null>(null);

/** Opening and closing the task drawer, which never changes: for the parts that only ask. */
export function useTaskDrawer() {
  const value = useContext(ActionsContext);
  if (!value) throw new Error('A gaveta da tarefa está indisponível.');
  return value;
}

/** What the drawer shows, or null while it is closed. */
export const useDrawerContent = () => useContext(ContentContext);

/**
 * The task drawer's state, in the shell rather than in the address (docs/etapas/10-quadro-tarefa.md, decision
 * 11): it stays open while the pages change, and each opening keeps the element it came from.
 */
export function TaskDrawerProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<DrawerContent | null>(null);
  const current = useRef<DrawerContent | null>(null);
  current.current = content;
  const openedFrom = useRef<HTMLElement | null>(null);
  const guard = useRef<(() => boolean) | null>(null);
  const keys = useRef(0);
  const taskCommands = useRef<TaskCommands | null>(null);
  const actions = useMemo<TaskDrawerActions>(() => {
    /** A new task leaving the drawer tells whoever started it. */
    const leaveNew = () => {
      const was = current.current;
      guard.current = null;
      if (was?.mode === 'new') was.onClose?.();
    };
    return {
      openTask: (task) => {
        leaveNew();
        openedFrom.current = pageFocus();
        setContent({ mode: 'task', id: task.id, projectId: task.projectId, title: task.title });
      },
      newTask: (projectId, options = {}) => {
        leaveNew();
        openedFrom.current = pageFocus();
        keys.current += 1;
        setContent({ mode: 'new', projectId, key: keys.current, ...options });
      },
      showTask: (task) => {
        leaveNew();
        setContent({ mode: 'task', id: task.id, projectId: task.projectId, title: task.title });
      },
      close: ({ force = false } = {}) => {
        if (!current.current) return;
        if (!force && guard.current && !guard.current()) return;
        leaveNew();
        setContent(null);
        returnFocus(openedFrom.current);
      },
      setCloseGuard: (next) => {
        guard.current = next;
      },
      opener: () => (openedFrom.current?.isConnected ? openedFrom.current : null),
      taskCommands,
    };
  }, []);
  return (
    <ActionsContext.Provider value={actions}>
      <ContentContext.Provider value={content}>{children}</ContentContext.Provider>
    </ActionsContext.Provider>
  );
}
