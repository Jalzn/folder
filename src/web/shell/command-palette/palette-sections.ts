import { searchText, type TaskStatus } from '@tinyfold/workspace/domain';
import { queryWords } from '../../lib/highlight';
import type { SearchResult } from '../../lib/queries';
import type { Project } from '../../lib/types';
import { activeProjects } from '../project/project-order';
import { type Command, type CommandId, filterCommands } from './commands';

/** What choosing a row does; the palette runs it after it closes. */
export type PaletteAction =
  | { kind: 'here'; id: string }
  | { kind: 'item'; type: SearchResult['type']; id: string; projectId: string }
  | { kind: 'project'; id: string; unarchive: boolean }
  | { kind: 'command'; id: CommandId };

/** An action of the open item under "Neste item": its files, Fixar, Mover para projeto…, the trash. */
export interface HereAction {
  id: string;
  label: string;
  shortcut?: readonly string[] | undefined;
}

export interface PaletteRowData {
  /** One key per row, `<section>:<id>`, which the menu reports on a choice. */
  key: string;
  label: string;
  action: PaletteAction;
  shortcut?: readonly string[] | undefined;
  /** A note at the end of the row, such as "atual". */
  detail?: string | undefined;
  excerpt?: string | undefined;
  archived?: boolean;
  /** A task's column, shown before its project. */
  status?: TaskStatus | undefined;
  /** The project an item belongs to, by id and name. */
  project?: { id: string; name: string } | undefined;
}

export interface PaletteSection {
  id: 'here' | 'items' | 'projects' | 'commands';
  title: string;
  rows: PaletteRowData[];
}

export interface PaletteInput {
  query: string;
  /** The open item's actions, or none outside an item page. */
  here: readonly HereAction[];
  results: readonly SearchResult[];
  projects: readonly Project[];
  /** availableCommands for the screen behind the palette. */
  commands: readonly Command[];
}

/**
 * The palette's sections from what the screen and the search give (docs/etapas/08-fundacao.md, "Buscar e
 * ⌘K"): Neste item, then Itens (the eight edited last, without an excerpt, before any text), then Projetos
 * (with text, or the archived ones to unarchive when none is active), then Comandos. Empty sections are left
 * out; the query filters everything but the search's own results.
 */
export function paletteSections({ query, here, results, projects, commands }: PaletteInput): PaletteSection[] {
  const typed = query.trim() !== '';
  const words = queryWords(query);
  const matches = (text: string) => words.every((word) => searchText(text).includes(word));
  const noActive = activeProjects([...projects]).length === 0;

  const sections: PaletteSection[] = [
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
        label: result.title || 'Sem título',
        action: { kind: 'item', type: result.type, id: result.id, projectId: result.projectId },
        archived: result.projectArchived,
        // A search shows where its words are; the recent items show none, as in the prototype.
        excerpt: typed && 'excerpt' in result ? result.excerpt : undefined,
        status: 'status' in result ? result.status : undefined,
        project: { id: result.projectId, name: result.projectName },
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
