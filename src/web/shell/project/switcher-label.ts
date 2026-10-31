import type { Project } from '../../lib/types';
import { activeProjects } from './project-order';

/**
 * What the switcher's trigger says: the current project, or, on a page without one, whether there is an
 * active project to choose, so an unknown address does not claim there is none.
 */
export function switcherLabel(project: Project | null, projects: Project[]) {
  if (project) return { name: project.name, label: `Projeto ${project.name}. Trocar de projeto` };
  const name = activeProjects(projects).length ? 'Escolher projeto' : 'Nenhum projeto ativo';
  return { name, label: `${name}. Abrir o seletor` };
}

/** Said when a shortcut needs the current project and the page has none. */
export const noProjectText = (projects: Project[]) =>
  activeProjects(projects).length ? 'Escolha um projeto no seletor.' : 'Nenhum projeto ativo.';
