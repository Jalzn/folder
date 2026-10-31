import { ChevronsUpDown, PanelLeftClose } from 'lucide-react';
import { Button as AriaButton } from 'react-aria-components';
import { useProjects } from '../../lib/queries';
import type { Project } from '../../lib/types';
import { IconButton, Logo, ProjectMark } from '../../ui';
import { ProjectSwitcher } from '../project/ProjectSwitcher';
import { switcherLabel } from '../project/switcher-label';
import type { SwitcherPlace } from '../shell-ui';

/** The project switcher and, on hover or focus, the button that collapses the sidebar. */
export function SidebarHeader({
  project,
  place,
  collapseLabel,
  onCollapse,
}: {
  project: Project | null;
  place: SwitcherPlace;
  collapseLabel: string;
  onCollapse: () => void;
}) {
  const label = switcherLabel(project, useProjects(true).data ?? []);
  return (
    <div className="sidebar-header">
      <ProjectSwitcher
        current={project}
        place={place}
        trigger={
          <AriaButton className="sidebar-header__switcher" aria-label={label.label}>
            {project ? <ProjectMark name={project.name} color={project.color} /> : <Logo compact />}
            <span className="sidebar-header__name">{label.name}</span>
            <ChevronsUpDown size={12} aria-hidden="true" />
          </AriaButton>
        }
      />
      <IconButton
        className="sidebar-header__collapse"
        label={collapseLabel}
        shortcut={['mod', '\\']}
        onPress={onCollapse}
      >
        <PanelLeftClose size={16} />
      </IconButton>
    </div>
  );
}
