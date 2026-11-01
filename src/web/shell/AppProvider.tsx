import { useNavigate } from '@tanstack/react-router';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, refreshWorkspace, reportSessionError } from '../lib/api';
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
  /** "Usar o fuso deste aparelho" in the Perfil; resolves to false when the server refused it. */
  setTimeZone: (timeZone: string) => Promise<boolean>;
  /** Creates a document in the project, or in one of its folders, and opens it. */
  newDocument: (projectId: string, folderId?: string) => Promise<void>;
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
      return true;
    } catch (error) {
      reportSessionError(error);
      return false;
    }
  }, []);
  // The first load with no zone stored gives it this device's, once.
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

  async function newDocument(projectId: string, folderId?: string) {
    const input = { projectId, ...(folderId ? { folderId } : {}) };
    await documentAction.run(
      () => api.workspace.createDocument({ ...input, requestId: documentRequest.for(input) }),
      (document) => {
        documentRequest.clear();
        void navigate({ href: paths.document(projectId, document.id) });
      },
    );
  }
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
