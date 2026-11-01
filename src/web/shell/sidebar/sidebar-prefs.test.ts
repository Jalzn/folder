import { describe, expect, it } from 'vitest';
import { parseSidebarPrefs, projectPrefs, withProject } from './sidebar-prefs';

describe('sidebar preferences', () => {
  it('starts expanded, with no project visited yet', () => {
    const prefs = parseSidebarPrefs(null);
    expect(prefs.collapsed).toBe(false);
    expect(projectPrefs(prefs, 'p')).toBeNull();
  });

  it('reads the order and the open folders, and drops what does not fit', () => {
    const prefs = parseSidebarPrefs(
      JSON.stringify({
        collapsed: true,
        projects: { p: { sort: 'title', expanded: ['a', 'a', 3, 'b'] }, q: { sort: 'size' }, r: 3 },
      }),
    );
    expect(prefs.collapsed).toBe(true);
    expect(projectPrefs(prefs, 'p')).toEqual({ sort: 'title', expanded: ['a', 'b'] });
    expect(projectPrefs(prefs, 'q')).toEqual({ sort: 'recent', expanded: [] });
    expect(projectPrefs(prefs, 'r')).toBeNull();
    expect(parseSidebarPrefs('{')).toEqual(parseSidebarPrefs(null));
  });

  it('drops the per-section format of stage 08, so the order goes back to Recentes', () => {
    const prefs = parseSidebarPrefs(
      JSON.stringify({ collapsed: true, sections: { p: { documents: { open: false, sort: 'title' } } } }),
    );
    expect(prefs).toEqual({ collapsed: true, projects: {} });
  });

  it('changes one project and keeps the others', () => {
    const prefs = withProject(withProject(parseSidebarPrefs(null), 'q', { sort: 'created' }), 'p', { expanded: ['f'] });
    expect(projectPrefs(prefs, 'p')).toEqual({ sort: 'recent', expanded: ['f'] });
    expect(projectPrefs(prefs, 'q')).toEqual({ sort: 'created', expanded: [] });
  });
});
