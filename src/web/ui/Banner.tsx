import './banner.css';
import { Archive, CircleAlert, FileWarning, GitCompareArrows, Info } from 'lucide-react';
import { type ReactNode, useId } from 'react';

export type BannerTone = 'failure' | 'conflict' | 'draft' | 'archived' | 'info';

const icons: Record<BannerTone, ReactNode> = {
  failure: <CircleAlert size={16} aria-hidden="true" />,
  conflict: <GitCompareArrows size={16} aria-hidden="true" />,
  draft: <FileWarning size={16} aria-hidden="true" />,
  archived: <Archive size={16} aria-hidden="true" />,
  info: <Info size={16} aria-hidden="true" />,
};

/**
 * A band under the page header: save failure, conflict, recovered draft or archived project. An `urgent`
 * band, such as a failed save, announces its text as an alert; a lasting one, such as the archived project,
 * announces nothing. The actions stay out of the live region, grouped under the band's text.
 */
export function Banner({
  tone,
  urgent = false,
  children,
  actions,
}: {
  tone: BannerTone;
  urgent?: boolean;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const textId = useId();
  return (
    <div className="banner" data-tone={tone}>
      {icons[tone]}
      <div id={textId} className="banner__text" {...(urgent ? { role: 'alert' } : {})}>
        {children}
      </div>
      {actions && (
        <fieldset className="banner__actions" aria-labelledby={textId}>
          {actions}
        </fieldset>
      )}
    </div>
  );
}
