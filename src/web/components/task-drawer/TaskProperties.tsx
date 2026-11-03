import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { inBoardOrder } from '../../lib/board-order';
import { type ColumnSummary, useProjects } from '../../lib/queries';
import { activeProjects } from '../../shell/project';
import { ColumnRing, Menu, MenuItem, MenuTrigger, ProjectMark } from '../../ui';

/** A value of the properties grid: a ghost button that opens its menu, or its text when it cannot change. */
function PropertyValue({
  label,
  value,
  editable,
  menu,
}: {
  label: string;
  value: ReactNode;
  editable: boolean;
  menu: ReactNode;
}) {
  if (!editable) return <span className="task-prop task-prop--static">{value}</span>;
  return (
    <MenuTrigger>
      <AriaButton className="task-prop" aria-label={label}>
        {value}
        <ChevronDown size={14} className="task-prop__chevron" aria-hidden="true" />
      </AriaButton>
      {menu}
    </MenuTrigger>
  );
}

/**
 * The board's columns as radios in board order, each with its ring, the done one marked; each item's ID is
 * the column's, after `prefix` in a menu that has other items.
 */
export function columnMenuItems(columns: readonly ColumnSummary[], prefix = '') {
  return inBoardOrder(columns).map((column, index, all) => (
    <MenuItem
      key={column.id}
      id={`${prefix}${column.id}`}
      icon={<ColumnRing index={index} count={all.length} isDone={column.isDone} />}
      detail={column.isDone ? 'conclusão' : undefined}
    >
      {column.name}
    </MenuItem>
  ));
}

/** The column, as radios in board order. */
export function ColumnField({
  columnId,
  columns,
  editable,
  onChange,
}: {
  columnId: string | undefined;
  columns: readonly ColumnSummary[];
  editable: boolean;
  onChange: (columnId: string, name: string) => void;
}) {
  const name = columns.find((column) => column.id === columnId)?.name ?? '—';
  return (
    <PropertyValue
      label={`Coluna: ${name}`}
      value={name}
      editable={editable && columns.length > 0}
      menu={
        <Menu
          aria-label="Coluna"
          placement="bottom start"
          selectionMode="single"
          selectedKeys={columnId ? [columnId] : []}
          onAction={(key) => {
            const chosen = columns.find((column) => column.id === key);
            if (chosen && chosen.id !== columnId) onChange(chosen.id, chosen.name);
          }}
        >
          {columnMenuItems(columns)}
        </Menu>
      }
    />
  );
}

/** The project, with its mark; the menu has the active projects. */
export function ProjectField({
  projectId,
  editable,
  onChange,
}: {
  projectId: string;
  editable: boolean;
  onChange: (projectId: string, name: string) => void;
}) {
  const projects = useProjects(true).data ?? [];
  const project = projects.find((each) => each.id === projectId);
  const value = project ? (
    <>
      <ProjectMark name={project.name} color={project.color} />
      {project.name}
    </>
  ) : (
    '—'
  );
  return (
    <PropertyValue
      label={`Projeto: ${project?.name ?? ''}`}
      value={value}
      editable={editable && Boolean(project)}
      menu={
        <Menu
          aria-label="Projeto"
          placement="bottom start"
          selectionMode="single"
          selectedKeys={[projectId]}
          onAction={(key) => {
            const chosen = projects.find((each) => each.id === key);
            if (chosen && chosen.id !== projectId) onChange(chosen.id, chosen.name);
          }}
        >
          {activeProjects(projects).map((each) => (
            <MenuItem key={each.id} id={each.id} icon={<ProjectMark name={each.name} color={each.color} />}>
              {each.name}
            </MenuItem>
          ))}
        </Menu>
      }
    />
  );
}

/**
 * The properties grid of 88 px + 1fr with 30 px rows (docs/interface/visual.md, "Gaveta da tarefa"): a label
 * in 12/16 and a value in 13/20 for each row given, in order.
 */
export function TaskProperties({
  label,
  rows,
  children,
}: {
  label: string;
  rows: { id: string; label: string; value: ReactNode }[];
  /** What follows the grid, as the origin. */
  children?: ReactNode;
}) {
  return (
    <aside className="task-drawer__props" aria-label={label}>
      <dl className="task-props">
        {rows.map((row) => (
          <div key={row.id} className="task-props__row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      {children}
    </aside>
  );
}
