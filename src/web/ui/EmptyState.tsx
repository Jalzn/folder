import './empty-state.css';
import type { ReactNode } from 'react';

/** A calm empty place: what is missing, why, and what to do about it. */
export function EmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state__icon">{icon}</div>}
      <h2 className="empty-state__title">{title}</h2>
      {description && <p className="empty-state__description">{description}</p>}
      {children && <div className="empty-state__actions">{children}</div>}
    </div>
  );
}
