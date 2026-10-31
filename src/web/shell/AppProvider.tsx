import { useNavigate } from '@tanstack/react-router';
import { createContext, type ReactNode, useContext, useState } from 'react';
import { api } from '../lib/api';
import type { Project } from '../lib/types';
import { useAction } from '../lib/use-action';
import { useRequest } from '../lib/use-request';
import { TaskDialog } from '../pages/Board';
import { paths } from '../router/paths';
import type { Owner } from './LoginScreen';
import { ProjectDialog } from './project/ProjectDialog';

interface AppContextValue {
  owner: Owner;
  /** Creates a document in the project and opens it. */
  newDocument: (projectId: string) => Promise<void>;
  /** Creates a drawing in the project and opens it. */
  newCanvas: (projectId: string) => Promise<void>;
  /** Opens the dialog of a new task in the project. */
  newTask: (projectId: string) => void;
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

/** What every screen can ask of the app: who is signed in, creating items and the project dialog. */
export function AppProvider({ owner, children }: { owner: Owner; children: ReactNode }) {
  const navigate = useNavigate();
  const documentAction = useAction();
  const canvasAction = useAction();
  const documentRequest = useRequest();
  const canvasRequest = useRequest();
  const [projectDialog, setProjectDialog] = useState<{ project?: Project } | null>(null);
  const [taskProjectId, setTaskProjectId] = useState<string | null>(null);

  async function newDocument(projectId: string) {
    const input = { projectId };
    await documentAction.run(
      () => api.workspace.createDocument({ ...input, requestId: documentRequest.for(input) }),
      (document) => {
        documentRequest.clear();
        void navigate({ href: paths.document(projectId, document.id) });
      },
    );
  }
  async function newCanvas(projectId: string) {
    const input = { projectId };
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
    newDocument,
    newCanvas,
    newTask: setTaskProjectId,
    openProjectDialog: (project) => setProjectDialog(project ? { project } : {}),
    creatingDocument: documentAction.busy,
    creatingCanvas: canvasAction.busy,
  };
  return (
    <AppContext.Provider value={value}>
      {children}
      {projectDialog && <ProjectDialog project={projectDialog.project} onClose={() => setProjectDialog(null)} />}
      <TaskDialog
        open={taskProjectId !== null}
        onClose={() => setTaskProjectId(null)}
        initialProjectId={taskProjectId}
      />
    </AppContext.Provider>
  );
}
