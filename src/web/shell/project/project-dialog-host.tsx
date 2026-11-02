import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from 'react';
import type { Project } from '../../lib/types';
import { pageFocus, returnFocus } from '../../ui';
import { ProjectDialog } from './ProjectDialog';

export interface ProjectDialogValue {
  /** Opens "Novo projeto", or "Renomear projeto" for a project. */
  openProjectDialog: (project?: Project) => void;
}

const ProjectDialogContext = createContext<ProjectDialogValue | null>(null);

export function useProjectDialog() {
  const value = useContext(ProjectDialogContext);
  if (!value) throw new Error('Contexto do aplicativo indisponível');
  return value;
}

/** The project dialog, opened from a menu, N or ⌘K, and drawn after the app (WF-4). */
export function ProjectDialogHost({ children }: { children: ReactNode }) {
  const [projectDialog, setProjectDialog] = useState<{ project?: Project } | null>(null);
  // Where the focus was on the page before a dialog opened from a menu, N or ⌘K, whose item is gone by the
  // time it closes: the focus goes back there, or to the page's title.
  const focusBefore = useRef<HTMLElement | null>(null);
  const noteFocus = useCallback(() => {
    focusBefore.current = pageFocus();
  }, []);
  const value: ProjectDialogValue = {
    openProjectDialog: (project) => {
      noteFocus();
      setProjectDialog(project ? { project } : {});
    },
  };
  return (
    <ProjectDialogContext.Provider value={value}>
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
    </ProjectDialogContext.Provider>
  );
}
