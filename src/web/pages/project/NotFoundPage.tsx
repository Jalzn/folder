import { Download } from 'lucide-react';
import { useState } from 'react';
import { downloadFile } from '../../lib/download';
import { draftDownload, localDrafts } from '../../lib/local-drafts';
import type { ItemType } from '../../lib/types';
import { PageStatus, useApp } from '../../shell';
import { Button, PageHeader } from '../../ui';

/** A missing address inside the shell: an item deleted for good, or a project that does not exist. */
export function NotFoundPage({ title, description }: { title: string; description: string }) {
  return (
    <PageStatus>
      <PageHeader title={title} description={description} />
    </PageStatus>
  );
}

/** An item deleted for good. A draft this browser still keeps for it can be downloaded. */
export function ItemNotFound({ type, id }: { type: ItemType; id: string }) {
  const app = useApp();
  const [draft] = useState(() => {
    try {
      return localDrafts(localStorage, app.owner.installationId, type, id)[0] ?? null;
    } catch {
      return null;
    }
  });
  function download() {
    if (!draft) return;
    const { blob, fileName } = draftDownload(type, id, draft);
    downloadFile(blob, fileName);
  }
  return (
    <PageStatus>
      <PageHeader
        title="Este item não existe mais"
        description={
          draft
            ? 'Ele foi excluído de vez. Este navegador ainda guarda um rascunho dele.'
            : 'Ele foi excluído de vez e não pode ser restaurado.'
        }
      >
        {draft && (
          <Button icon={<Download size={16} />} onPress={download}>
            Baixar rascunho
          </Button>
        )}
      </PageHeader>
    </PageStatus>
  );
}
