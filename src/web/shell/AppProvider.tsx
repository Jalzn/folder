import { useNavigate } from '@tanstack/react-router';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, errorMessage, refreshWorkspace, reportSessionError } from '../lib/api';
import { deviceTimeZone, useToday } from '../lib/civil-date';
import type { Project } from '../lib/types';
import { useAction } from '../lib/use-action';
import { useRequest } from '../lib/use-request';
import { paths } from '../router/paths';
import { pageFocus, returnFocus } from '../ui';
import type { Owner } from './LoginScreen';
import { ProjectDialog } from './project/ProjectDialog';

interface AppContextValue {
  owner: Owner;
  /**
   * The owner's time zone (docs/etapas/10-quadro-tarefa.md, decision 1): today, late and the 14 days of the
   * done column count in it. UTC until set; the first load sets it to this device's.
   */
  timeZone: string;
  /**
   * "Usar o fuso deste aparelho" in the Perfil: resolves to null once stored, or to why it was not, as a fixed
   * offset the server refuses.
   */
  setTimeZone: (timeZone: string) => Promise<string | null>;
  /** Creates a document in the project, or in one of its folders, and opens it with the focus on its title. */
  newDocument: (projectId: string, folderId?: string) => Promise<void>;
  /**
   * The page of a document calls it with its title as it opens: the title of the one `newDocument` just made
   * takes the focus, whichever path asked for it (the Novo menu, N or ⌘K), as the menu or the palette gives
   * the focus back to the page being left.
   */
  newDocumentOpened: (documentId: string, title: HTMLTextAreaElement) => void;
  /** Creates a drawing in the project, or in one of its folders, and opens it. */
  newCanvas: (projectId: string, folderId?: string) => Promise<void>;
  /** Opens "Novo projeto", or "Renomear projeto" for a project. */
  openProjectDialog: (project?: Project) => void;
  creatingDocument: boolean;
  creatingCanvas: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('Contexto do aplicativo indisponível');
  return value;
}

/** Today in the owner's time zone, kept current at midnight and when the tab comes back. */
export const useOwnerToday = () => useToday(useApp().timeZone);

/** What every screen can ask of the app: who is signed in, creating items and the project dialog. */
export function AppProvider({ owner, children }: { owner: Owner; children: ReactNode }) {
  const navigate = useNavigate();
  const documentAction = useAction();
  const canvasAction = useAction();
  const documentRequest = useRequest();
  const canvasRequest = useRequest();
  const [projectDialog, setProjectDialog] = useState<{ project?: Project } | null>(null);
  const [timeZone, setZone] = useState(owner.timeZone ?? 'UTC');
  const setTimeZone = useCallback(async (next: string) => {
    try {
      const saved = await api.auth.setTimeZone({ timeZone: next });
      setZone(saved.timeZone);
      // The board's window and the late counts are the server's, in the zone just set.
      await refreshWorkspace();
      return null;
    } catch (error) {
      reportSessionError(error);
      return errorMessage(error);
    }
  }, []);
  // The first load with no zone stored, or a stored offset the server now reads as none, gives it this device's
  // once per load; a refusal leaves UTC, which the Perfil shows.
  const unset = !owner.timeZone;
  useEffect(() => {
    if (unset) void setTimeZone(deviceTimeZone());
  }, [unset, setTimeZone]);
  // Where the focus was on the page before a dialog opened from a menu, N or ⌘K, whose item is gone by the
  // time it closes: the focus goes back there, or to the page's title.
  const focusBefore = useRef<HTMLElement | null>(null);
  const noteFocus = useCallback(() => {
    focusBefore.current = pageFocus();
  }, []);

  /** The document `newDocument` made, until its page opens (newDocumentOpened). */
  const madeDocument = useRef<string | null>(null);
  async function newDocument(projectId: string, folderId?: string) {
    const input = { projectId, ...(folderId ? { folderId } : {}) };
    await documentAction.run(
      () => api.workspace.createDocument({ ...input, requestId: documentRequest.for(input) }),
      (document) => {
        documentRequest.clear();
        madeDocument.current = document.id;
        void navigate({ href: paths.document(projectId, document.id) });
      },
    );
  }
  const newDocumentOpened = useCallback((documentId: string, title: HTMLTextAreaElement) => {
    if (madeDocument.current !== documentId) return;
    madeDocument.current = null;
    title.focus({ preventScroll: true });
  }, []);
  async function newCanvas(projectId: string, folderId?: string) {
    const input = { projectId, ...(folderId ? { folderId } : {}) };
    await canvasAction.run(
      () => api.workspace.createCanvas({ ...input, requestId: canvasRequest.for(input) }),
      (canvas) => {
        canvasRequest.clear();
        void navigate({ href: paths.drawing(projectId, canvas.id) });
      },
    );
  }
  const value: AppContextValue = {
    owner,
    timeZone,
    setTimeZone,
    newDocument,
    newDocumentOpened,
    newCanvas,
    openProjectDialog: (project) => {
      noteFocus();
      setProjectDialog(project ? { project } : {});
    },
    creatingDocument: documentAction.busy,
    creatingCanvas: canvasAction.busy,
  };
  return (
    <AppContext.Provider value={value}>
      {children}
      {projectDialog && (
        <ProjectDialog
          project={projectDialog.project}
          onClose={() => {
            setProjectDialog(null);
            returnFocus(focusBefore.current);
          }}
        />
      )}
    </AppContext.Provider>
  );
}
