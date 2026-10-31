import './page-frame.css';
import type { ReactNode } from 'react';

/**
 * A page in the shell: a 44 px bar with the page's actions on the right (the save state and ⋯ of an
 * editor, Novo, Esvaziar lixeira), over the page's own scroll area. The scroll area carries
 * `data-scroll-key`, so the last location keeps its position. The page's focusable `h1` goes in `children`.
 * `fill` gives the body the whole height without scrolling, for the drawing editor.
 */
export function PageFrame({
  actions,
  fill = false,
  children,
}: {
  actions?: ReactNode;
  fill?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="page-frame">
      <div className="page-frame__bar">{actions}</div>
      <div className="page-frame__body" data-fill={fill || undefined} {...(fill ? {} : { 'data-scroll-key': 'page' })}>
        {children}
      </div>
    </div>
  );
}

/** A page that only waits or reports: a spinner, an error, a missing item. */
export function PageStatus({ children }: { children: ReactNode }) {
  return (
    <PageFrame>
      <div className="page-frame__status">{children}</div>
    </PageFrame>
  );
}
