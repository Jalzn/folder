import type { NavSection } from '@tinyfold/workspace/domain';
import { ChevronRight, FileText, Shapes } from 'lucide-react';
import type { Project } from '../../lib/types';
import { paths } from '../../router/paths';
import { IconButton, Popover, PopoverTrigger } from '../../ui';
import { SidebarRow } from './SidebarRow';
import { sectionRows } from './section-rows';
import type { SectionKind } from './sidebar-prefs';
import { useOpenItem } from './use-open-item';
import { useRovingFocus } from './use-roving-focus';

const kinds = {
  documents: { type: 'document', label: 'Documentos', icon: FileText, index: 'documentos' },
  drawings: { type: 'drawing', label: 'Desenhos', icon: Shapes, index: 'desenhos' },
} as const;

/** On the collapsed rail, Documentos and Desenhos open the same short list in a 280 px popover. */
export function RailPopover({
  project,
  kind,
  section,
}: {
  project: Project;
  kind: SectionKind;
  section: NavSection | undefined;
}) {
  const { type, label, icon: Icon, index } = kinds[kind];
  const open = useOpenItem(type);
  const roving = useRovingFocus<HTMLUListElement>();
  const rows = section ? sectionRows(section, open) : null;
  const row = (item: NavSection['items'][number]) => (
    <li key={item.id}>
      <SidebarRow
        href={paths.item(project.id, type, item.id)}
        icon={<Icon size={16} />}
        label={item.title || 'Sem título'}
        current={open?.id === item.id}
      />
    </li>
  );
  return (
    <PopoverTrigger>
      <IconButton label={label} className="rail__button">
        <Icon size={16} />
      </IconButton>
      <Popover aria-label={`${label} de ${project.name}`} placement="right top" className="rail-popover">
        <div className="rail-popover__head">
          <span>{label}</span>
          <span className="rail-popover__count">{section?.total ?? ''}</span>
        </div>
        {rows && (
          <ul ref={roving.ref} className="sidebar-section__list" onKeyDown={roving.onKeyDown}>
            {rows.pinned.map(row)}
            {rows.pinned.length > 0 && rows.items.length > 0 && (
              <li className="sidebar-section__rule" aria-hidden="true" />
            )}
            {rows.items.map(row)}
            {rows.active && row(rows.active)}
            {rows.seeAll !== null && (
              <li>
                <SidebarRow
                  href={paths.index(project.id, index)}
                  icon={<ChevronRight size={16} />}
                  label="Ver todos"
                  meta={rows.seeAll}
                />
              </li>
            )}
            {section?.total === 0 && <li className="sidebar-section__empty">Nada aqui ainda.</li>}
          </ul>
        )}
      </Popover>
    </PopoverTrigger>
  );
}
