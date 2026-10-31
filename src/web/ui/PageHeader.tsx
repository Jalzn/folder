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

/**
 * Moves focus to the page's title once nothing holds it, as when the row that had it went away, or a dialog
 * closed over a row that is gone. Gives up after about half a second if focus lands somewhere on its own.
 */
export function focusPageTitle() {
  let attempts = 0;
  const attempt = () => {
    const active = document.activeElement;
    const free = !active || active === document.body || !active.isConnected;
    const heading = document.querySelector<HTMLElement>('main h1[tabindex="-1"]');
    if (free && heading && !document.querySelector('.modal-overlay')) {
      heading.focus({ preventScroll: true });
      return;
    }
    if (attempts++ < 30) requestAnimationFrame(attempt);
  };
  requestAnimationFrame(attempt);
}
