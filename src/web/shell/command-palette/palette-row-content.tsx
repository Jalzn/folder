import { TASK_STATUSES, taskStatusLabels } from '@tinyfold/workspace/domain';
import {
  ArrowLeft,
  ArrowRightLeft,
  Circle,
  FileText,
  Folder,
  FolderPlus,
  FoldVertical,
  Keyboard,
  KeyRound,
  LayoutDashboard,
  Monitor,
  Moon,
  PanelLeft,
  Plus,
  Save,
  Shapes,
  SquareKanban,
  Sun,
  Table2,
  Trash2,
} from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';
import { placeLabel } from '../../lib/place-label';
import type { Project } from '../../lib/types';
import { ColumnRing, ProjectMark } from '../../ui';
import type { CommandId } from './commands';
import type { PaletteRowData } from './palette-sections';

const commandIcons: Record<CommandId, ReactElement> = {
  'new-document': <FileText size={16} />,
  'new-drawing': <Shapes size={16} />,
  'new-folder': <FolderPlus size={16} />,
  'new-task': <Circle size={16} />,
  'switch-project': <ArrowRightLeft size={16} />,
  overview: <LayoutDashboard size={16} />,
  board: <SquareKanban size={16} />,
  index: <Table2 size={16} />,
  trash: <Trash2 size={16} />,
  'collapse-folders': <FoldVertical size={16} />,
  'theme-system': <Monitor size={16} />,
  'theme-light': <Sun size={16} />,
  'theme-dark': <Moon size={16} />,
  'toggle-sidebar': <PanelLeft size={16} />,
  profile: <KeyRound size={16} />,
  'new-project': <FolderPlus size={16} />,
  shortcuts: <Keyboard size={16} />,
  save: <Save size={16} />,
  back: <ArrowLeft size={16} />,
};

/** A row's icon: the item action's own, a task's column ring, the item type, a project's mark, a command's. */
export function rowIcon(
  row: PaletteRowData,
  here: readonly { id: string; icon?: ReactNode }[],
  projects: readonly Project[],
): ReactNode {
  const { action } = row;
  if (action.kind === 'here') return here.find((entry) => entry.id === action.id)?.icon;
  if (action.kind === 'item') {
    if (row.status)
      return <ColumnRing index={TASK_STATUSES.indexOf(row.status)} count={TASK_STATUSES.length} size={16} />;
    return action.type === 'document' ? <FileText size={16} /> : <Shapes size={16} />;
  }
  if (action.kind === 'folder') return <Folder size={16} />;
  if (action.kind === 'project') {
    const project = projects.find((candidate) => candidate.id === action.id);
    return project && <ProjectMark name={project.name} color={project.color} />;
  }
  return action.id === 'new-project' ? <Plus size={16} /> : commandIcons[action.id];
}

/** What goes on a row's right: an item's column and place ("Tinyfold › MCP"), a folder's project, or a command's note. */
export function rowRight(row: PaletteRowData, projects: readonly Project[]): ReactNode {
  if (!row.project) return row.detail;
  const project = projects.find((candidate) => candidate.id === row.project?.id);
  return (
    <>
      {row.status && <span>{taskStatusLabels[row.status]} ·</span>}
      <span className="palette-row__project">
        {project && <ProjectMark name={project.name} color={project.color} size={16} />}
        {placeLabel(row.project.name, row.folder)}
      </span>
    </>
  );
}
