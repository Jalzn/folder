import { Menu as MenuIcon, Search } from 'lucide-react';
import { Button as AriaButton } from 'react-aria-components';
import type { Project } from '../lib/types';
import { IconButton, Logo, ProjectMark } from '../ui';
import { ProjectSwitcher } from './project/ProjectSwitcher';
import { useShellUi } from './shell-ui';

/** Below 720 px: the menu that opens the sidebar over the page, and the current project, which opens the switcher. */
export function TopBar({ project, onMenu }: { project: Project | null; onMenu: () => void }) {
  const ui = useShellUi();
  return (
    <header className="top-bar" data-region="sidebar">
      <IconButton label="Abrir navegação" onPress={onMenu}>
        <MenuIcon size={16} />
      </IconButton>
      <ProjectSwitcher
        current={project}
        place="top-bar"
        trigger={
          <AriaButton
            className="top-bar__project"
            aria-label={
              project ? `Projeto ${project.name}. Trocar de projeto` : 'Nenhum projeto ativo. Abrir o seletor'
            }
          >
            {project ? <ProjectMark name={project.name} color={project.color} /> : <Logo compact />}
            <span className="top-bar__name">{project?.name ?? 'Nenhum projeto ativo'}</span>
          </AriaButton>
        }
      />
      <IconButton
        label="Buscar e comandar"
        shortcut={['mod', 'K']}
        className="top-bar__search"
        onPress={() => ui.openPalette()}
      >
        <Search size={16} />
      </IconButton>
    </header>
  );
}
