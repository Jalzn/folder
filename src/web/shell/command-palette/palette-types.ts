import type { TaskStatus } from '@tinyfold/workspace/domain';
import type { SearchResult } from '../../lib/queries';
import type { CommandId } from './commands';

/** What choosing a row does; the palette runs it after it closes. */
export type PaletteAction =
  | { kind: 'here'; id: string }
  | { kind: 'item'; type: SearchResult['type']; id: string; projectId: string }
  | { kind: 'project'; id: string; unarchive: boolean }
  | { kind: 'folder'; id: string; projectId: string }
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
  /** Muted words after the label, such as "pasta · 12 itens". */
  note?: string | undefined;
  action: PaletteAction;
  shortcut?: readonly string[] | undefined;
  /** A note at the end of the row, such as "atual". */
  detail?: string | undefined;
  excerpt?: string | undefined;
  archived?: boolean;
  /** A task's column, shown before its project. */
  status?: TaskStatus | undefined;
  /** A task's column by name, from the search, shown before its project. */
  column?: { id: string; name: string; isDone: boolean } | undefined;
  /** The project an item belongs to, by id and name. */
  project?: { id: string; name: string } | undefined;
  /** The folder a document or drawing is in, after its project: "Tinyfold › MCP". */
  folder?: { name: string } | null | undefined;
}

export interface PaletteSection {
  id: 'task' | 'here' | 'items' | 'projects' | 'folders' | 'commands';
  title: string;
  rows: PaletteRowData[];
}
