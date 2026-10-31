import './page-header.css';
import type { ReactNode } from 'react';

/**
 * A page's title block: the title in the page style, focusable so navigation can move focus to it, an
 * optional summary and the page's actions. No eyebrow (docs/interface/refino.md §8).
 */
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="page-header__text">
        <h1 className="page-header__title t-title" tabIndex={-1}>
          {title}
        </h1>
        {description && <p className="page-header__description">{description}</p>}
      </div>
      {children && <div className="page-header__actions">{children}</div>}
    </header>
  );
}
