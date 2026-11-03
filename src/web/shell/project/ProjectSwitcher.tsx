import './project-switcher.css';
import { useNavigate } from '@tanstack/react-router';
import { searchText } from '@tinyfold/workspace/domain';
import { Check, Plus } from 'lucide-react';
import type { ReactElement } from 'react';
import { Menu as AriaMenu, SearchField as AriaSearchField, Autocomplete, Input } from 'react-aria-components';
import { countOf } from '../../lib/count';
import { useProjects } from '../../lib/queries';
import type { Project } from '../../lib/types';
import { paths } from '../../router/paths';
import { Kbd, MenuItem, MenuSection, MenuSeparator, Popover, PopoverTrigger, ProjectMark } from '../../ui';
import { useApp } from '../AppProvider';
import { type SwitcherPlace, useShellOverlays } from '../shell-ui';
import { activeProjects } from './project-order';

const NEW_PROJECT = 'new';

/** Accent- and case-insensitive, with the domain's search normalisation; "+ Novo projeto" always shows. */
const matches = (text: string, input: string, key: string | number) =>
  key === NEW_PROJECT || searchText(text).includes(searchText(input));

function ProjectOption({
  project,
  current,
  shortcut,
}: {
  project: Project & { overdueTasks?: number };
  current: boolean;
  shortcut?: number;
}) {
  const late = project.overdueTasks ? (
    <span className="project-switcher__late">{countOf(project.overdueTasks, 'atrasada', 'atrasadas')}</span>
  ) : null;
  return (
    <MenuItem
      id={project.id}
      textValue={project.name}
      icon={<ProjectMark name={project.name} color={project.color} />}
      detail={
        late || current || shortcut !== undefined ? (
          <>
            {late}
            {current ? (
              <Check className="project-switcher__current" size={16} aria-label="atual" />
            ) : shortcut !== undefined ? (
              <Kbd>{`G ${shortcut}`}</Kbd>
            ) : null}
          </>
        ) : undefined
      }
    >
      {project.name}
    </MenuItem>
  );
}

/**
 * The project switcher (G P): a filter, the active projects in switcher order with G 1–9, the archived ones,
 * and "+ Novo projeto". ↵ opens the chosen project's Visão geral; Esc closes it.
 */
export function ProjectSwitcher({
  current,
  trigger,
  place,
  placement = 'bottom start',
}: {
  current: Project | null;
  trigger: ReactElement;
  /** Which switcher this is, so G P opens the one on screen. */
  place: SwitcherPlace;
  placement?: 'bottom start' | 'right top';
}) {
  const app = useApp();
  const ui = useShellOverlays();
  const navigate = useNavigate();
  const projects = useProjects(true).data ?? [];
  const active = activeProjects(projects);
  const archived = projects.filter((project) => project.archivedAt);
  function choose(key: string, close: () => void) {
    close();
    if (key === NEW_PROJECT) app.openProjectDialog();
    else void navigate({ href: paths.overview(key) });
  }
  return (
    <PopoverTrigger isOpen={ui.switcherAt === place} onOpenChange={(open) => ui.setSwitcherAt(open ? place : null)}>
      {trigger}
      <Popover aria-label="Trocar de projeto" placement={placement} className="project-switcher">
        {({ close }) => (
          <Autocomplete filter={(text, input, node) => matches(text, input, node.key)}>
            <AriaSearchField aria-label="Trocar de projeto" className="project-switcher__filter" autoFocus>
              <Input className="project-switcher__input" placeholder="Trocar de projeto…" />
            </AriaSearchField>
            <AriaMenu
              className="menu project-switcher__list"
              aria-label="Projetos"
              onAction={(key) => choose(String(key), close)}
            >
              {active.length > 0 && (
                <MenuSection title="Ativos">
                  {active.map((project, index) => (
                    <ProjectOption
                      key={project.id}
                      project={project}
                      current={project.id === current?.id}
                      {...(index < 9 ? { shortcut: index + 1 } : {})}
                    />
                  ))}
                </MenuSection>
              )}
              {archived.length > 0 && (
                <MenuSection title="Arquivados">
                  {archived.map((project) => (
                    <ProjectOption key={project.id} project={project} current={project.id === current?.id} />
                  ))}
                </MenuSection>
              )}
              <MenuSeparator />
              <MenuItem id={NEW_PROJECT} textValue="Novo projeto" icon={<Plus size={16} />}>
                Novo projeto
              </MenuItem>
            </AriaMenu>
          </Autocomplete>
        )}
      </Popover>
    </PopoverTrigger>
  );
}
