import './glyphs.css';

/** The Tinyfold mark, a folded page, with the wordmark unless compact. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo">
      <svg className="logo__mark" width="24" height="24" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path d="M8 7h16l9 9v17H8V7Z" fill="currentColor" />
        <path className="logo__fold" d="M24 7v9h9" />
        <path className="logo__lines" d="M14 23h13M14 28h8" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {!compact && (
        <span className="logo__name">
          tinyfold<span className="logo__period">.</span>
        </span>
      )}
    </span>
  );
}
