import { useLocation } from '@tanstack/react-router';
import type { NavSection } from '@tinyfold/workspace/domain';
import { FileText, Shapes } from 'lucide-react';
import { useEffect, useState } from 'react';
import { displayTitle, type Project } from '../../lib/types';
import { paths } from '../../router/paths';
import { IconButton, Popover, PopoverTrigger } from '../../ui';
import { SectionList } from './SectionList';
import { SidebarRow } from './SidebarRow';
import { sectionKinds, sectionRows } from './section-rows';
import type { SectionKind } from './sidebar-prefs';
import { useOpenItem } from './use-open-item';
import { useRovingFocus } from './use-roving-focus';

const icons = { documents: FileText, drawings: Shapes } as const;

/**
 * The popover's list, mounted with the popover, so its rows get their tab stop and the first focus: ↓ and
 * ↑ move, ↵ opens.
 */
function RailList({ project, kind, section }: { project: Project; kind: SectionKind; section: NavSection }) {
  const { type, index } = sectionKinds[kind];
  const Icon = icons[kind];
  const open = useOpenItem(type);
  const roving = useRovingFocus<HTMLUListElement>();
  const rows = sectionRows(section, open);
  useEffect(() => {
    // The current row, or the first, takes the focus as the popover opens.
    roving.ref.current?.querySelector<HTMLElement>('[data-roving][tabindex="0"]')?.focus();
  }, [roving.ref]);
  const row = (item: NavSection['items'][number]) => (
    <li key={item.id}>
      <SidebarRow
        href={paths.item(project.id, type, item.id)}
        icon={<Icon size={16} />}
        label={displayTitle(item.title)}
        current={open?.id === item.id}
      />
    </li>
  );
  return (
    <SectionList
      rows={rows}
      total={section.total}
      seeAllHref={paths.index(project.id, index)}
      renderItem={row}
      listRef={roving.ref}
      onKeyDown={roving.onKeyDown}
    />
  );
}

/**
 * On the collapsed rail, Documentos and Desenhos open the same short list in a 280 px popover. Choosing an
 * item closes it, and the new page takes the focus.
 */
export function RailPopover({
  project,
  kind,
  section,
}: {
  project: Project;
  kind: SectionKind;
  section: NavSection | undefined;
}) {
  const { label } = sectionKinds[kind];
  const Icon = icons[kind];
  const [isOpen, setOpen] = useState(false);
  const pathname = useLocation({ select: (location) => location.pathname });
  // biome-ignore lint/correctness/useExhaustiveDependencies: A new page, from a row of the list, closes it.
  useEffect(() => setOpen(false), [pathname]);
  return (
    <PopoverTrigger isOpen={isOpen} onOpenChange={setOpen}>
      <IconButton label={label} className="rail__button">
        <Icon size={16} />
      </IconButton>
      <Popover aria-label={`${label} de ${project.name}`} placement="right top" className="rail-popover">
        <div className="rail-popover__head">
          <span>{label}</span>
          <span className="rail-popover__count">{section?.total ?? ''}</span>
        </div>
        {section && <RailList project={project} kind={kind} section={section} />}
      </Popover>
    </PopoverTrigger>
  );
}
