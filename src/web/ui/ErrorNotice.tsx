import './error-notice.css';
import { CircleAlert } from 'lucide-react';
import { errorMessage } from '../lib/api';

/** A failure to load, with the server's message and a retry. */
export function ErrorNotice({ error, retry }: { error: unknown; retry?: (() => void) | undefined }) {
  return (
    <div className="error-notice" role="alert">
      <CircleAlert size={16} aria-hidden="true" />
      <span className="error-notice__text">{errorMessage(error)}</span>
      {retry && (
        <button type="button" className="error-notice__retry" onClick={retry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
