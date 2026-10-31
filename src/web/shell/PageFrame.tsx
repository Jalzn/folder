import './page-frame.css';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useShellUi } from './shell-ui';
import { useLayoutMode } from './use-layout-mode';

/**
 * A page in the shell: a 44 px bar with the page's actions on the right (the save state and ⋯ of an
 * editor, Novo, Esvaziar lixeira), over the page's own scroll area; below 720 px the actions go to the top
 * bar instead. The scroll area carries
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
  const mode = useLayoutMode();
  const { topBarActions } = useShellUi();
  // Below 720 px the top bar is the page's only bar, and the actions move into it.
  const inTopBar = mode === 'narrow' && topBarActions;
  return (
    <div className="page-frame">
      {inTopBar ? createPortal(actions, topBarActions) : <div className="page-frame__bar">{actions}</div>}
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
