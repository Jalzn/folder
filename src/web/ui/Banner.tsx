import './banner.css';
import { Archive, CircleAlert, FileWarning, GitCompareArrows, Info } from 'lucide-react';
import type { ReactNode } from 'react';

export type BannerTone = 'failure' | 'conflict' | 'draft' | 'archived' | 'info';

const icons: Record<BannerTone, ReactNode> = {
  failure: <CircleAlert size={16} aria-hidden="true" />,
  conflict: <GitCompareArrows size={16} aria-hidden="true" />,
  draft: <FileWarning size={16} aria-hidden="true" />,
  archived: <Archive size={16} aria-hidden="true" />,
  info: <Info size={16} aria-hidden="true" />,
};

/** A band under the page header: save failure, conflict, recovered draft or archived project. */
export function Banner({ tone, children, actions }: { tone: BannerTone; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="banner" role="status" data-tone={tone}>
      {icons[tone]}
      <div className="banner__text">{children}</div>
      {actions && <div className="banner__actions">{actions}</div>}
    </div>
  );
}
