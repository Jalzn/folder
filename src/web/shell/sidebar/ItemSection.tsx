import type { NavSection, NavSort } from '@tinyfold/workspace/domain';
import { ChevronRight, Ellipsis, Plus } from 'lucide-react';
import { type KeyboardEvent, useId } from 'react';
import { formatCount } from '../../lib/count';
import { isPendingSave } from '../../lib/save-registry';
import type { Project } from '../../lib/types';
import { paths } from '../../router/paths';
import { IconButton, Menu, MenuItem, MenuTrigger } from '../../ui';
import { useApp } from '../AppProvider';
import { usePins } from '../project/use-pins';
import { SectionList } from './SectionList';
import { SidebarItem } from './SidebarItem';
import { sectionKinds, sectionRows } from './section-rows';
import type { SectionKind } from './sidebar-prefs';
import { useOpenItem } from './use-open-item';
import { usePendingSaves } from './use-pending-saves';
import { useSidebarPrefs } from './use-sidebar-prefs';

const sortLabels: Record<NavSort, string> = { recent: 'Recentes', title: 'A–Z', created: 'Criação' };

/**
 * Documentos or Desenhos: the label collapses the section (← and → do it with focus on it), "+" creates in
 * the project and "⋯" orders the list. Pinned items come first, above a line, then up to eight, the open
 * item always, and "Ver todos" opens the Índice.
 */
export function ItemSection({
  project,
  kind,
  section,
}: {
  project: Project;
  kind: SectionKind;
  section: NavSection | undefined;
}) {
  const app = useApp();
  const prefs = useSidebarPrefs();
  const pins = usePins();
  const pending = usePendingSaves();
  const { type, label, noun, index } = sectionKinds[kind];
  const open = useOpenItem(type);
  const listId = useId();
  const { open: expanded, sort } = prefs.section(project.id, kind);
  const archived = Boolean(project.archivedAt);
  const rows = section ? sectionRows(section, open) : null;
  const setExpanded = (value: boolean) => prefs.setSection(project.id, kind, { open: value });
  function toggleKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      setExpanded(event.key === 'ArrowRight');
    }
  }
  const create = () => (type === 'document' ? app.newDocument(project.id) : app.newCanvas(project.id));
  const item = (entry: NavSection['items'][number]) => (
    <SidebarItem
      key={entry.id}
      type={type}
      item={entry}
      projectId={project.id}
      current={open?.id === entry.id}
      pending={isPendingSave(pending, type, entry.id)}
      onPin={() => void pins.pin(type, entry.id)}
      onUnpin={() => void pins.unpin(type, entry.id)}
    />
  );
  return (
    <section className="sidebar-section" aria-label={label}>
      <div className="sidebar-section__head">
        <button
          type="button"
          className="sidebar-section__toggle"
          data-roving
          tabIndex={-1}
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded(!expanded)}
          onKeyDown={toggleKey}
        >
          <span className="sidebar-section__label">{label}</span>
          <ChevronRight className="sidebar-section__chevron" size={12} aria-hidden="true" />
        </button>
        <span className="sidebar-section__tools">
          {!archived && (
            <IconButton label={`Novo ${noun}`} size="sm" onPress={() => void create()}>
              <Plus size={14} />
            </IconButton>
          )}
          <MenuTrigger>
            <IconButton label={`Ordenar ${label.toLowerCase()}`} size="sm">
              <Ellipsis size={14} />
            </IconButton>
            <Menu
              aria-label={`Ordenar ${label.toLowerCase()}`}
              placement="bottom start"
              selectionMode="single"
              selectedKeys={[sort]}
              onAction={(key) => prefs.setSection(project.id, kind, { sort: key as NavSort })}
            >
              {(Object.keys(sortLabels) as NavSort[]).map((option) => (
                <MenuItem key={option} id={option}>
                  {sortLabels[option]}
                </MenuItem>
              ))}
            </Menu>
          </MenuTrigger>
        </span>
        <span className="sidebar-section__count">{section ? formatCount(section.total) : ''}</span>
      </div>
      {expanded && rows && section && (
        <SectionList
          id={listId}
          rows={rows}
          total={section.total}
          seeAllHref={paths.index(project.id, index)}
          renderItem={item}
        />
      )}
    </section>
  );
}
