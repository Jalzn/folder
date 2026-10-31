import './sidebar.css';
import type { Project } from '../../lib/types';
import { ItemSection } from './ItemSection';
import { SidebarFooter } from './SidebarFooter';
import { SidebarHeader } from './SidebarHeader';
import { SidebarNav } from './SidebarNav';
import { useNavigationData } from './use-navigation-data';
import { useRovingFocus } from './use-roving-focus';

/**
 * The project's sidebar, variant A (docs/interface/sidebar.md): the switcher, Visão geral and Quadro fixed
 * at the top, Documentos and Desenhos scrolling, Você and the trash fixed at the bottom. Without an active
 * project only the switcher and Você remain.
 */
export function ProjectSidebar({
  project,
  collapseLabel,
  onCollapse,
}: {
  project: Project | null;
  collapseLabel: string;
  onCollapse: () => void;
}) {
  const navigation = useNavigationData(project);
  const roving = useRovingFocus<HTMLElement>();
  return (
    <div className="sidebar">
      <SidebarHeader project={project} collapseLabel={collapseLabel} onCollapse={onCollapse} />
      {project && (
        <nav
          ref={roving.ref}
          className="sidebar__nav"
          aria-label={`Projeto ${project.name}`}
          onKeyDown={roving.onKeyDown}
        >
          <SidebarNav project={project} openTasks={navigation?.openTasks} />
          <div className="sidebar__sections">
            <ItemSection project={project} kind="documents" section={navigation?.documents} />
            <ItemSection project={project} kind="drawings" section={navigation?.drawings} />
          </div>
        </nav>
      )}
      {!project && <div className="sidebar__spacer" />}
      <SidebarFooter project={project} trashCount={navigation?.trashCount} />
    </div>
  );
}
