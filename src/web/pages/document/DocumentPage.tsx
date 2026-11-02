import './document.css';
import type { Document } from '../../lib/types';
import { DocumentEditor } from './DocumentEditor';

/**
 * A document's page, once its route found it under its own project. In the trash, the editor shows the way to
 * restore it, or keeps the text not yet saved (DocumentEditor).
 */
export function DocumentPage({ document }: { document: Document }) {
  return <DocumentEditor key={document.id} document={document} />;
}
