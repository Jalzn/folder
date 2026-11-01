import type { ReactNode } from 'react';
import { MenuItem as AriaMenuItem } from 'react-aria-components';
import { Highlight, shortcutLabel } from '../../ui';

/**
 * A row of the palette: icon, label with the terms in bold and a muted note ("pasta · 12 itens"), what goes on
 * the right (project and folder, shortcut, "atual") and, for items, one line of excerpt.
 */
export function PaletteRow({
  id,
  icon,
  label,
  note,
  query,
  right,
  shortcut,
  excerpt,
  archived = false,
}: {
  id: string;
  icon: ReactNode;
  label: string;
  note?: string | undefined;
  query: string;
  right?: ReactNode;
  shortcut?: readonly string[] | undefined;
  excerpt?: string | undefined;
  archived?: boolean;
}) {
  return (
    <AriaMenuItem id={id} textValue={label} className="palette-row">
      <span className="palette-row__line">
        {icon}
        <span className="palette-row__label">
          <Highlight text={label} query={query} />
          {note && <span className="palette-row__note"> · {note}</span>}
        </span>
        {archived && <span className="palette-row__archived">arquivado</span>}
        {right && <span className="palette-row__right">{right}</span>}
        {shortcut && <span className="palette-row__right">{shortcutLabel(shortcut)}</span>}
      </span>
      {excerpt && (
        <span className="palette-row__excerpt">
          <Highlight text={excerpt} query={query} />
        </span>
      )}
    </AriaMenuItem>
  );
}
