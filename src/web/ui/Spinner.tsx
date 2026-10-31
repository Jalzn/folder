import './spinner.css';
import { LoaderCircle } from 'lucide-react';

/** A spinning icon for a pending control; the control itself tells assistive technology. */
export function SpinnerIcon({ size = 16 }: { size?: number }) {
  return <LoaderCircle className="spinner-icon" size={size} aria-hidden="true" />;
}

/** A loading line with its own status announcement. */
export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <span className="spinner" role="status">
      <SpinnerIcon />
      {label}
    </span>
  );
}
