import './document.css';
import { TrashedItem } from '../../components/editor';
import type { Document } from '../../lib/types';
import { PageFrame } from '../../shell';
import { DocumentEditor } from './DocumentEditor';

/** A document's page, once its route found it under its own project; in the trash, the way to restore it. */
export function DocumentPage({ document }: { document: Document }) {
  if (document.deletedAt)
    return (
      <PageFrame>
        <TrashedItem
          title="Este documento está na lixeira"
          description="Você pode restaurá-lo para continuar escrevendo."
          projectId={document.projectId}
        />
      </PageFrame>
    );
  return <DocumentEditor key={document.id} document={document} />;
}
