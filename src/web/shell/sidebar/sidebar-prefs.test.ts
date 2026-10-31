import { describe, expect, it } from 'vitest';
import { defaultSectionPrefs, parseSidebarPrefs, sectionPrefs, withSection } from './sidebar-prefs';

describe('sidebar preferences', () => {
  it('starts expanded, with open sections in recent order', () => {
    const prefs = parseSidebarPrefs(null);
    expect(prefs.collapsed).toBe(false);
    expect(sectionPrefs(prefs, 'p', 'documents')).toEqual(defaultSectionPrefs);
  });

  it('reads stored preferences and drops what does not fit', () => {
    const prefs = parseSidebarPrefs(
      JSON.stringify({
        collapsed: true,
        sections: { p: { documents: { open: false, sort: 'title' }, drawings: { open: 'x', sort: 'size' } }, q: 3 },
      }),
    );
    expect(prefs.collapsed).toBe(true);
    expect(sectionPrefs(prefs, 'p', 'documents')).toEqual({ open: false, sort: 'title' });
    expect(sectionPrefs(prefs, 'p', 'drawings')).toEqual(defaultSectionPrefs);
    expect(prefs.sections.q).toBeUndefined();
    expect(parseSidebarPrefs('{')).toEqual(parseSidebarPrefs(null));
  });

  it('changes one section of one project', () => {
    const prefs = withSection(parseSidebarPrefs(null), 'p', 'drawings', { sort: 'created' });
    expect(sectionPrefs(prefs, 'p', 'drawings')).toEqual({ open: true, sort: 'created' });
    expect(sectionPrefs(prefs, 'p', 'documents')).toEqual(defaultSectionPrefs);
    expect(sectionPrefs(prefs, 'q', 'drawings')).toEqual(defaultSectionPrefs);
  });
});
