import './board.css';
import { useNavigate } from '@tanstack/react-router';
import { CircleCheck, Columns3, Ellipsis, LayoutDashboard, Settings2, X } from 'lucide-react';
import { paths } from '../../navigation/paths';
import { KEYS } from '../../shell/keyboard';
import { useShellActions } from '../../shell/state';
import { IconButton, Menu, MenuItem, MenuSeparator, MenuTrigger } from '../../ui';
import type { BoardCommands } from './BoardColumns';
export function BoardMenu({
  projectId,
  archived,
  chosen,
  commands,
  filter,
}: {
  projectId: string;
  archived: boolean;
  chosen: readonly string[];
  commands: React.RefObject<BoardCommands>;
  filter: (ids: readonly string[]) => void;
}) {
  const navigate = useNavigate({ from: '/projetos/$projectId/quadro' });
  const ui = useShellActions();
  return (
    <MenuTrigger>
      <IconButton label="Mais ações do quadro">
        <Ellipsis size={16} />
      </IconButton>
      <Menu
        aria-label="Mais ações do quadro"
        disabledKeys={[...(archived ? ['column'] : []), ...(chosen.length ? [] : ['clear'])]}
        onAction={(key) => {
          if (key === 'completed') void navigate({ href: paths.completed(projectId) });
          else if (key === 'column') commands.current.addColumn?.();
          else if (key === 'labels') ui.setLabelsOpen(true);
          else if (key === 'clear') filter([]);
          else void navigate({ href: paths.overview(projectId) });
        }}
      >
        <MenuItem id="completed" icon={<CircleCheck size={16} />}>
          Ver concluídas
        </MenuItem>
        <MenuItem id="column" icon={<Columns3 size={16} />}>
          Nova coluna
        </MenuItem>
        <MenuItem id="labels" icon={<Settings2 size={16} />}>
          Gerenciar etiquetas…
        </MenuItem>
        <MenuItem id="clear" icon={<X size={16} />}>
          Limpar filtro de etiquetas
        </MenuItem>
        <MenuSeparator />
        <MenuItem id="overview" icon={<LayoutDashboard size={16} />} shortcut={KEYS.overview}>
          Visão geral
        </MenuItem>
      </Menu>
    </MenuTrigger>
  );
}
