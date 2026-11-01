import { describe, expect, it } from 'vitest';
import { availableCommands, type CommandContext, filterCommands } from './commands';

const context: CommandContext = {
  project: { name: 'Tinyfold', archived: false },
  hasActiveProject: true,
  theme: 'dark',
  sidebarCollapsed: false,
  canSave: false,
  hasFolders: false,
};
const ids = (value: CommandContext) => availableCommands(value).map((command) => command.id);

describe('palette commands', () => {
  it('offers creation, the project pages and the app commands in a project', () => {
    expect(ids(context)).toEqual([
      'new-document',
      'new-drawing',
      'new-folder',
      'new-task',
      'switch-project',
      'overview',
      'board',
      'index',
      'trash',
      'completed',
      'labels',
      'theme-system',
      'theme-light',
      'theme-dark',
      'toggle-sidebar',
      'profile',
      'new-project',
      'shortcuts',
      'back',
    ]);
  });

  it('keeps only the allowed commands without an active project', () => {
    expect(ids({ ...context, project: null, hasActiveProject: false })).toEqual([
      'theme-system',
      'theme-light',
      'theme-dark',
      'toggle-sidebar',
      'profile',
      'new-project',
      'shortcuts',
      'back',
    ]);
    expect(ids({ ...context, project: { name: 'Antigo', archived: true }, hasActiveProject: false })).not.toContain(
      'overview',
    );
  });

  it('creates nothing in an archived project, and saves only on a page that can', () => {
    const archived = ids({ ...context, project: { name: 'Antigo', archived: true } });
    expect(archived).not.toContain('new-document');
    expect(archived).not.toContain('new-folder');
    expect(archived).toContain('trash');
    expect(ids({ ...context, canSave: true })).toContain('save');
  });

  it('closes every folder only in a project that has folders, after the pages', () => {
    expect(ids(context)).not.toContain('collapse-folders');
    const withFolders = ids({ ...context, hasFolders: true });
    expect(withFolders.slice(withFolders.indexOf('trash'), withFolders.indexOf('trash') + 4)).toEqual([
      'trash',
      'completed',
      'labels',
      'collapse-folders',
    ]);
    expect(filterCommands(availableCommands({ ...context, hasFolders: true }), 'pasta').map((c) => c.id)).toEqual([
      'new-folder',
      'collapse-folders',
    ]);
  });

  it('marks the current theme and names the sidebar command by its state', () => {
    const commands = availableCommands({ ...context, sidebarCollapsed: true });
    expect(commands.find((command) => command.id === 'theme-dark')?.detail).toBe('atual');
    expect(commands.find((command) => command.id === 'theme-light')?.detail).toBeUndefined();
    expect(commands.find((command) => command.id === 'toggle-sidebar')?.label).toBe('Expandir a lateral');
  });

  it('filters by label and keywords, ignoring case and accents, every word required', () => {
    const commands = availableCommands(context);
    expect(filterCommands(commands, 'ESCURO').map((command) => command.id)).toEqual(['theme-dark']);
    expect(filterCommands(commands, 'visao').map((command) => command.id)).toEqual(['overview']);
    expect(filterCommands(commands, 'indice').map((command) => command.id)).toEqual(['index']);
    expect(filterCommands(commands, 'tema claro').map((command) => command.id)).toEqual(['theme-light']);
    expect(filterCommands(commands, 'kanban').map((command) => command.id)).toEqual(['board']);
    expect(filterCommands(commands, '')).toHaveLength(commands.length);
  });
});
