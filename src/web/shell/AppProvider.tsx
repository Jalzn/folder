import { useNavigate } from '@tanstack/react-router';
import { createContext, type ReactNode, useContext, useState } from 'react';
import { api } from '../lib/api';
import type { Project, Task } from '../lib/types';
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
  /** Opens a task's dialog over the current page. */
  openTask: (task: Task) => void;
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

/** What every screen can ask of the app: who is signed in, creating items, the task and project dialogs. */
export function AppProvider({ owner, children }: { owner: Owner; children: ReactNode }) {
  const navigate = useNavigate();
  const documentAction = useAction();
  const canvasAction = useAction();
  const documentRequest = useRequest();
  const canvasRequest = useRequest();
  const [projectDialog, setProjectDialog] = useState<{ project?: Project } | null>(null);
  // Closing keeps the task, so the dialog does not change its title while it leaves.
  const [taskDialog, setTaskDialog] = useState<{ open: boolean; task?: Task; projectId?: string }>({ open: false });

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
    newTask: (projectId) => setTaskDialog({ open: true, projectId }),
    openTask: (task) => setTaskDialog({ open: true, task }),
    openProjectDialog: (project) => setProjectDialog(project ? { project } : {}),
    creatingDocument: documentAction.busy,
    creatingCanvas: canvasAction.busy,
  };
  return (
    <AppContext.Provider value={value}>
      {children}
      {projectDialog && <ProjectDialog project={projectDialog.project} onClose={() => setProjectDialog(null)} />}
      <TaskDialog
        open={taskDialog.open}
        onClose={() => setTaskDialog((current) => ({ ...current, open: false }))}
        task={taskDialog.task}
        initialProjectId={taskDialog.projectId ?? null}
      />
    </AppContext.Provider>
  );
}
