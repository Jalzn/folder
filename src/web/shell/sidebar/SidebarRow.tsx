import { Link } from '@tanstack/react-router';
import type { KeyboardEvent, ReactNode } from 'react';

export interface SidebarRowProps {
  href: string;
  icon: ReactNode;
  label: string;
  /** The page this row opens is the current one. */
  current?: boolean;
  /** A value at the right edge, such as a count. */
  meta?: ReactNode;
  /** The item has a change the server has not confirmed, or a failed save. */
  pending?: boolean;
  onKeyDown?: (event: KeyboardEvent<HTMLAnchorElement>) => void;
}

/** A 28 px row of the sidebar: a real link, so a middle click opens another tab. */
export function SidebarRow({ href, icon, label, current = false, meta, pending = false, onKeyDown }: SidebarRowProps) {
  return (
    <Link
      to={href}
      activeOptions={{ exact: true, includeSearch: false }}
      className="sidebar-row"
      data-roving
      tabIndex={-1}
      aria-current={current ? 'page' : undefined}
      {...(onKeyDown ? { onKeyDown } : {})}
    >
      {icon}
      <span className="sidebar-row__name">{label}</span>
      {pending && <span className="sidebar-row__pending" role="img" aria-label="não salvo" />}
      {meta !== undefined && <span className="sidebar-row__meta">{meta}</span>}
    </Link>
  );
}
