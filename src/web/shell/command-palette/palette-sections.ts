import { matchesAllWords } from '../../lib/highlight';
import type { SearchResult } from '../../lib/queries';
import { displayTitle, type Project } from '../../lib/types';
import { activeProjects } from '../project/project-order';
import { type Command, filterCommands } from './commands';
import { folderRows, type PaletteFolder } from './palette-folders';
import type { HereAction, PaletteSection } from './palette-types';

export type { HereAction, PaletteAction, PaletteRowData, PaletteSection } from './palette-types';

export interface PaletteInput {
  query: string;
  /** The open item's actions, or none outside an item page. */
  here: readonly HereAction[];
  /** "Nesta tarefa", the open task's actions, before the page's. */
  task?: readonly HereAction[];
  results: readonly SearchResult[];
  projects: readonly Project[];
  /** Every project's active folders, for the Pastas group. */
  folders: readonly PaletteFolder[];
  /** availableCommands for the screen behind the palette. */
  commands: readonly Command[];
}

/**
 * The palette's sections from what the screen and the search give (docs/etapas/08-fundacao.md, "Buscar e
 * ⌘K"): Neste item, then Itens (the eight edited last, without an excerpt, before any text), then Projetos
 * (with text, or the archived ones to unarchive when none is active), then Pastas (with text,
 * palette-folders.ts), then Comandos. Empty sections are left out; the query filters everything but the
 * search's own results.
 */
export function paletteSections({
  query,
  task = [],
  here,
  results,
  projects,
  folders,
  commands,
}: PaletteInput): PaletteSection[] {
  const typed = query.trim() !== '';
  const matches = (text: string) => matchesAllWords(text, query);
  const noActive = activeProjects([...projects]).length === 0;

  const actions = (list: readonly HereAction[]) =>
    list
      .filter((action) => matches(action.label))
      .map((action) => ({
        key: `here:${action.id}`,
        label: action.label,
        action: { kind: 'here' as const, id: action.id },
        shortcut: action.shortcut,
      }));
  const sections: PaletteSection[] = [
    { id: 'task', title: 'Nesta tarefa', rows: actions(task) },
    {
      id: 'here',
      title: 'Neste item',
      rows: here
        .filter((action) => matches(action.label))
        .map((action) => ({
          key: `here:${action.id}`,
          label: action.label,
          action: { kind: 'here', id: action.id },
          shortcut: action.shortcut,
        })),
    },
    {
      id: 'items',
      title: typed ? 'Itens' : 'Editados recentemente',
      rows: results.map((result) => ({
        key: `item:${result.type}:${result.id}`,
        label: displayTitle(result.title),
        action: { kind: 'item', type: result.type, id: result.id, projectId: result.projectId },
        archived: result.projectArchived,
        // A search shows where its words are; the recent items show none, as in the prototype.
        excerpt: typed && 'excerpt' in result ? result.excerpt : undefined,
        status: 'status' in result ? result.status : undefined,
        column: 'column' in result ? result.column : undefined,
        project: { id: result.projectId, name: result.projectName },
        folder: 'folder' in result ? result.folder : undefined,
      })),
    },
    {
      id: 'projects',
      title: 'Projetos',
      rows: (typed ? projects.filter((project) => matches(project.name)) : noActive ? projects : []).map((project) => {
        const unarchive = noActive && Boolean(project.archivedAt);
        return {
          key: `project:${project.id}`,
          label: unarchive ? `Desarquivar ${project.name}` : project.name,
          action: { kind: 'project', id: project.id, unarchive },
          archived: Boolean(project.archivedAt),
        };
      }),
    },
    { id: 'folders', title: 'Pastas', rows: folderRows(query, folders, projects) },
    {
      id: 'commands',
      title: 'Comandos',
      rows: filterCommands([...commands], query).map((command) => ({
        key: `command:${command.id}`,
        label: command.label,
        action: { kind: 'command', id: command.id },
        shortcut: command.shortcut,
        detail: command.detail,
      })),
    },
  ];
  return sections.filter((section) => section.rows.length > 0);
}
