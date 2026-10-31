import './page-frame.css';
import type { ReactNode } from 'react';

/**
 * A page in the shell: a 44 px bar with the page's actions on the right (the ⋯ of a project, Novo, Esvaziar
 * lixeira), over the page's own scroll area. The scroll area carries `data-scroll-key`, so the last
 * location keeps its position. The page's focusable `h1` (PageHeader) goes in `children`.
 */
export function PageFrame({ actions, children }: { actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="page-frame">
      <div className="page-frame__bar">{actions}</div>
      <div className="page-frame__body" data-scroll-key="page">
        {children}
      </div>
    </div>
  );
}
